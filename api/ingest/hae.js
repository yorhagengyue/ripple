// POST /api/ingest/hae
// Direct HealthAutoExport → Supabase ingest. Bypasses Workato's upsert step
// (which has been silently dropping rows) while still forwarding the raw
// payload to the Workato Recipe 1 webhook so Twilio/alert/MCP downstream
// keeps firing.
//
// Expected HAE JSON body shape:
// {
//   "Data": {
//     "Metrics": [
//       {"Name":"heart_rate","Units":"count/min","Data":[{"Avg":82,"Min":70,"Max":95,"Date":"2026-04-21T08:00:00+0800","Source":"Apple Watch"}, ...]},
//       {"Name":"heart_rate_variability","Data":[{"Qty":42.1,"Date":"..."}]},
//       ...
//     ]
//   }
// }

import { DEMO_USER } from '../_lib/supabase.js';

const SUPA = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SECRET_KEY;

// HAE metric names → our canonical schema names
const HAE_MAP = {
  heart_rate: 'heart_rate',
  heart_rate_variability: 'hrv_sdnn',
  heart_rate_variability_sdnn: 'hrv_sdnn',
  hrv: 'hrv_sdnn',
  resting_heart_rate: 'resting_heart_rate',
  rhr: 'resting_heart_rate',
  walking_heart_rate_average: 'heart_rate',
  step_count: 'step_count',
  steps: 'step_count',
  active_energy: 'active_energy',
  active_energy_burned: 'active_energy',
  basal_energy_burned: 'active_energy',
  sleep_analysis: 'sleep_hours',
  sleep: 'sleep_hours',
  sleep_duration: 'sleep_hours',
  respiratory_rate: 'respiratory_rate',
  respiration: 'respiratory_rate',
  oxygen_saturation: 'spo2',
  blood_oxygen_saturation: 'spo2',
  spo2: 'spo2',
  vo2_max: 'vo2_max',
};

function canonicalise(haeName) {
  if (!haeName) return null;
  const slug = String(haeName).trim().toLowerCase().replace(/[\s\-]+/g, '_');
  return HAE_MAP[slug] || slug;
}

// Pull the first numeric value out of a HAE Data entry.
// HAE uses Avg/Min/Max for rate-like signals, Qty for cumulative (steps, energy),
// and a few variants for legacy fields.
function primaryValue(sample) {
  if (sample == null) return null;
  const keys = ['Avg', 'Qty', 'Value', 'Total', 'Sum', 'Asleep', 'asleep', 'value', 'qty', 'avg'];
  for (const k of keys) {
    const v = sample[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
  }
  return null;
}

function normaliseDate(d) {
  if (!d) return new Date().toISOString();
  try {
    // HAE often sends "2026-04-21 08:00:00 +0800" — ISO-ify
    let s = String(d).trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) s = s.replace(' ', 'T').replace(/ ([+-]\d{4})$/, '$1');
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) return dt.toISOString();
  } catch { /* fall through */ }
  return new Date().toISOString();
}

export default async function handler(req, res) {
  // Allow GET for health check
  if (req.method === 'GET') {
    res.status(200).json({ ok: true, endpoint: 'ingest/hae', method: 'POST HAE JSON here' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST or GET only' });
    return;
  }
  if (!SUPA || !KEY) {
    res.status(500).json({ error: 'Supabase service-role env not configured' });
    return;
  }

  // Collect raw body (Vercel parses JSON for us if content-type matches)
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = { __raw: body }; } }
  if (!body || typeof body !== 'object') body = {};

  // Persist EVERY incoming request (success or malformed) for debugging.
  // Insert a debug row into a diagnostic table OR log via console; we do console for Vercel logs.
  console.log('[hae ingest] hit', JSON.stringify({
    at: new Date().toISOString(),
    ua: (req.headers['user-agent'] || '').slice(0, 120),
    ct: req.headers['content-type'] || '',
    len: (req.headers['content-length'] || '') + '',
    keys: Object.keys(body || {}),
    bodySnippet: JSON.stringify(body).slice(0, 1000),
  }));

  // Also write a diagnostic row to Supabase with the full raw body so we can inspect from DB
  // even if we can't read Vercel logs fast enough.
  try {
    await fetch(`${SUPA}/rest/v1/alert_sessions`, {
      method: 'POST',
      headers: {
        apikey: KEY, authorization: `Bearer ${KEY}`,
        'content-type': 'application/json', prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: DEMO_USER,
        state: 'ingest_debug',
        free_text: `HAE hit ${new Date().toISOString()}  ua=${(req.headers['user-agent']||'').slice(0,60)}  keys=${Object.keys(body||{}).join(',')}`,
        context_tag: null,
        context: {
          ua: (req.headers['user-agent']||'').slice(0, 160),
          ct: req.headers['content-type'] || '',
          top_keys: Object.keys(body || {}),
          sample: JSON.parse(JSON.stringify(body)), // deep copy for storage
        },
        triggered_at: new Date().toISOString(),
      }),
    }).catch(() => {});
  } catch { /* swallow */ }

  const metricsIn = body?.Data?.Metrics || body?.data?.metrics || body?.Metrics;
  if (!Array.isArray(metricsIn) || metricsIn.length === 0) {
    res.status(400).json({
      error: 'Expected HAE payload: { Data: { Metrics: [{ Name, Data: [...] }] } }',
      received_keys: Object.keys(body || {}),
      hint: 'Check HAE "Export format" = Aggregated JSON. Also try toggling "Send as: JSON" (not CSV).',
    });
    return;
  }

  // Only write the metrics that actually matter for Ripple's demo.
  const ALLOWED = new Set([
    'heart_rate', 'hrv_sdnn', 'resting_heart_rate',
    'sleep_hours', 'sleep_efficiency',
    'step_count', 'active_energy',
    'spo2', 'respiratory_rate',
  ]);

  // Aggregate each metric's Data array into ONE summary row (not per-minute).
  // HAE sends hundreds of minute-level samples per push; we collapse to one.
  const rows = [];
  const perMetricSummary = {};
  const extraRows = []; // for sleep_analysis we may also derive sleep_efficiency

  for (const metric of metricsIn) {
    const canon = canonicalise(metric.Name || metric.name);
    if (!canon || !ALLOWED.has(canon)) continue;
    const data = metric.Data || metric.data || [];
    if (!data.length) continue;

    // Sort newest → oldest by date
    const sorted = [...data].sort((a, b) => {
      const da = new Date(a.Date || a.date || a.startDate || 0).getTime();
      const db = new Date(b.Date || b.date || b.startDate || 0).getTime();
      return db - da;
    });
    const latest = sorted[0];
    let value = primaryValue(latest);
    let min_val = latest.Min != null ? Number(latest.Min) : null;
    let max_val = latest.Max != null ? Number(latest.Max) : null;

    // Cumulative metrics: sum all samples (all of today)
    if (canon === 'step_count' || canon === 'active_energy') {
      value = sorted.reduce((s, x) => s + (primaryValue(x) || 0), 0);
      // min/max not meaningful for a sum
      min_val = null; max_val = null;
    }

    // Sleep: use totalSleep (hours) from latest sleep_analysis entry
    if (canon === 'sleep_hours') {
      const seg = latest;
      value = Number(seg.totalSleep ?? seg.Asleep ?? seg.asleep ?? 0);
      if (!Number.isFinite(value) || value <= 0) continue;

      // Derive sleep_efficiency = totalSleep / (totalSleep + awake)
      const awake = Number(seg.awake ?? 0);
      if (awake >= 0 && (value + awake) > 0) {
        extraRows.push({
          user_id: DEMO_USER,
          metric: 'sleep_efficiency',
          ts: normaliseDate(seg.Date || seg.date || seg.sleepEnd || seg.inBedEnd),
          value: +(value / (value + awake)).toFixed(3),
          min_val: null, max_val: null,
          source: (seg.Source || seg.source || 'HealthAutoExport').toString().slice(0, 64),
          extra: { derived_from: 'sleep_analysis' },
          created_at: new Date().toISOString(),
        });
        perMetricSummary['sleep_efficiency'] = 1;
      }
    }

    if (value == null || !Number.isFinite(value)) continue;

    rows.push({
      user_id: DEMO_USER,
      metric: canon,
      ts: normaliseDate(latest.Date || latest.date || latest.sleepEnd || latest.startDate),
      value: Number(value),
      min_val,
      max_val,
      source: (latest.Source || latest.source || metric.Source || 'HealthAutoExport').toString().slice(0, 64),
      extra: { samples_count: data.length, push_at: new Date().toISOString() },
      created_at: new Date().toISOString(),
    });
    perMetricSummary[canon] = data.length;
  }
  rows.push(...extraRows);

  let inserted = 0, supabaseError = null;
  if (rows.length) {
    try {
      // UPSERT on (user_id, metric, ts) unique constraint — overwrites same-timestamp rows
      const r = await fetch(`${SUPA}/rest/v1/healthlog?on_conflict=user_id,metric,ts`, {
        method: 'POST',
        headers: {
          apikey: KEY,
          authorization: `Bearer ${KEY}`,
          'content-type': 'application/json',
          prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(rows),
      });
      if (!r.ok) {
        supabaseError = `Supabase ${r.status}: ` + (await r.text()).slice(0, 240);
      } else {
        const created = await r.json().catch(() => []);
        inserted = Array.isArray(created) ? created.length : 0;
      }
    } catch (e) {
      supabaseError = String(e).slice(0, 240);
    }
  }

  // Forward aggregated clean rows to Workato (Recipe 1) so Workato is in the
  // real data write path. This is the "clean batch" contract — one payload
  // shaped as { user_id, source, received_at, rows: [ {metric, value, ts, ...} ] }
  // so the recipe's foreach can map each row's fields to Supabase directly
  // without HAE's Avg/Qty/nested-sample ambiguity.
  //
  // Enabled by default; set FORWARD_CLEAN_TO_WORKATO=0 to disable.
  let workatoStatus = null;
  const WORKATO_WEBHOOK = process.env.WORKATO_HAE_WEBHOOK
    || 'https://webhooks.trial.workato.com/webhooks/rest/75c7e434-bc99-44b9-99e7-705948d0a35d/ripple-health-data';
  if (process.env.FORWARD_CLEAN_TO_WORKATO !== '0' && rows.length) {
    try {
      const cleanBatch = {
        schema: 'ripple.clean.v1',
        user_id: DEMO_USER,
        source: 'HealthAutoExport',
        received_at: new Date().toISOString(),
        rows_count: rows.length,
        metrics_summary: perMetricSummary,
        // Flatten each row to a shallow object so Workato's sample-inferred
        // schema gives first-class pills for every field.
        rows: rows.map((r) => ({
          user_id: r.user_id,
          metric: r.metric,
          value: r.value,
          min_val: r.min_val,
          max_val: r.max_val,
          source: r.source,
          ts: r.ts,
          samples_count: r.extra?.samples_count ?? null,
        })),
      };
      const fw = await fetch(WORKATO_WEBHOOK, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cleanBatch),
      });
      workatoStatus = `clean-batch ${fw.status} rows=${rows.length}`;
    } catch (e) {
      workatoStatus = 'clean-batch error: ' + String(e).slice(0, 120);
    }
  } else if (process.env.FORWARD_TO_WORKATO === '1') {
    // Legacy raw-HAE forwarding (kept for backwards compat)
    try {
      const fw = await fetch(WORKATO_WEBHOOK, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      workatoStatus = `raw-hae ${fw.status}`;
    } catch (e) {
      workatoStatus = 'raw-hae error: ' + String(e).slice(0, 120);
    }
  } else {
    workatoStatus = 'disabled (no rows or FORWARD_CLEAN_TO_WORKATO=0)';
  }

  res.status(inserted || !rows.length ? 200 : 502).json({
    ok: inserted > 0 || !rows.length,
    rows_parsed: rows.length,
    rows_inserted: inserted,
    metrics: perMetricSummary,
    supabase_error: supabaseError,
    forwarded_to_workato: workatoStatus,
    received_at: new Date().toISOString(),
  });
}
