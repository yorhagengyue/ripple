// /api/baseline/recompute — native baseline recomputation (replaces the dead
// Workato nightly job). For each user+metric it computes a 30-day mean/std and a
// 7-day mean from healthlog, then writes the deviation into the `baseline` table.
// Reads + writes Supabase directly via the service-role key — no Workato, no
// pg_cron / DDL. Scheduled by Vercel Cron (see vercel.json), or called manually.
//
// Windows are anchored to each metric's LATEST sample (robust to gaps / dormant
// data — a metric that stopped updating still gets a baseline from its own tail).
//
// Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Manual callers
// pass `x-cron-secret: <CRON_SECRET>`. `?dry=1` computes without writing.
// `?user_id=` overrides the default demo user.

import { sbQuery, DEMO_USER } from '../_lib/supabase.js';

const SUPA = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SECRET_KEY;

const CANON = [
  'heart_rate', 'hrv_sdnn', 'resting_heart_rate', 'respiratory_rate', 'spo2',
  'sleep_hours', 'sleep_efficiency', 'step_count', 'active_energy',
];
const DAY = 86400000;
const WATCH_PCT = 7; // |deviation_pct| ≥ this → status 'watch'

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
function std(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1));
}
const round = (x, d = 2) => { const p = 10 ** d; return Math.round(x * p) / p; };

function computeRows(user_id, rows) {
  const out = [];
  for (const metric of CANON) {
    const series = rows
      .filter((r) => r.metric === metric && r.value != null)
      .map((r) => ({ v: Number(r.value), t: new Date(r.ts).getTime() }))
      .filter((r) => Number.isFinite(r.v) && Number.isFinite(r.t));
    if (!series.length) continue;
    const anchor = Math.max(...series.map((r) => r.t));
    const win30 = series.filter((r) => r.t >= anchor - 30 * DAY).map((r) => r.v);
    const win7  = series.filter((r) => r.t >= anchor - 7 * DAY).map((r) => r.v);
    const baseline_mean = mean(win30);
    if (baseline_mean == null) continue;
    const last_7d_mean = mean(win7);
    const deviation = last_7d_mean != null ? last_7d_mean - baseline_mean : null;
    const deviation_pct = deviation != null && baseline_mean ? (deviation / baseline_mean) * 100 : null;
    const status = deviation_pct != null && Math.abs(deviation_pct) >= WATCH_PCT ? 'watch' : 'normal';
    out.push({
      user_id, metric,
      baseline_mean: round(baseline_mean),
      baseline_std: round(std(win30)),
      last_7d_mean: last_7d_mean != null ? round(last_7d_mean) : null,
      deviation: deviation != null ? round(deviation) : null,
      deviation_pct: deviation_pct != null ? round(deviation_pct, 1) : null,
      status,
      n_30d: win30.length,
      n_7d: win7.length,
      anchor_ts: new Date(anchor).toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  return out;
}

// Write one baseline row: PATCH by (user_id, metric); if nothing matched, INSERT.
// Avoids any reliance on a unique constraint / on_conflict.
async function writeRow(row) {
  const { n_30d, n_7d, anchor_ts, ...persist } = row; // strip debug-only fields
  const sel = `user_id=eq.${encodeURIComponent(row.user_id)}&metric=eq.${encodeURIComponent(row.metric)}`;
  const common = { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json' };
  const patch = await fetch(`${SUPA}/rest/v1/baseline?${sel}`, {
    method: 'PATCH', headers: { ...common, prefer: 'return=representation' }, body: JSON.stringify(persist),
  });
  if (patch.ok) {
    const got = await patch.json();
    if (Array.isArray(got) && got.length) return 'updated';
  }
  const ins = await fetch(`${SUPA}/rest/v1/baseline`, {
    method: 'POST', headers: { ...common, prefer: 'return=representation' }, body: JSON.stringify(persist),
  });
  return ins.ok ? 'inserted' : `error ${ins.status}: ${(await ins.text()).slice(0, 160)}`;
}

export async function recomputeUser(user_id, { dry = false } = {}) {
  const rows = await sbQuery(
    'healthlog',
    `user_id=eq.${encodeURIComponent(user_id)}&select=metric,value,ts&order=ts.desc&limit=20000`,
  );
  if (!Array.isArray(rows) || !rows.length) return { user_id, updated: 0, note: 'no healthlog' };
  const computed = computeRows(user_id, rows);
  if (dry) return { user_id, dry: true, computed };
  const results = [];
  for (const r of computed) results.push({ metric: r.metric, op: await writeRow(r) });
  return { user_id, wrote: results.length, results };
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers['authorization'] === `Bearer ${secret}`;
  const hdr = req.headers['x-cron-secret'] === secret;
  if (!secret || (!auth && !hdr)) { res.status(401).json({ error: 'unauthorized' }); return; }

  const user = (req.query && req.query.user_id) || DEMO_USER;
  const dry = !!(req.query && (req.query.dry === '1' || req.query.dry === 'true'));
  try {
    const result = await recomputeUser(String(user), { dry });
    res.status(200).json({ ok: !result.results?.some((r) => String(r.op).startsWith('error')), ...result, at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e).slice(0, 300) });
  }
}
