// Vercel Serverless Function — POST /api/chat
// Persists both the user input and Kimi's reply to alert_sessions.
// Mirrored by the Vite dev middleware in vite.config.js for local dev parity.

import { logMessage, sbQuery, DEMO_USER } from './_lib/supabase.js';
import { costKey, checkCostGuard, recordTokens } from './_lib/cost-guard.js';

const KIMI_SYSTEM_PROMPT = `You are Ripple, a warm and empathetic wellness companion agent. The user's smartwatch feed and 7-day-vs-30-day baseline are provided to you below — you CAN read them. When the user asks about their heart rate or any vital, quote the actual number from the data block, do not deflect.

Your job:
1. If the user asks a direct question about a metric ("check my heart rate", "how's my sleep"), ANSWER with the number from the Vitals block, and a one-line interpretation vs baseline. Do not ask them "how are you feeling" in place of answering.
2. If the reply EXPLAINS an anomaly (e.g., gaming, workout, coffee, work stress, a startle, a dream) -> resolved=true, respond in ONE warm sentence plus a brief caring tip (<=2 sentences total).
3. If vague or too short to judge -> resolved=false, gently probe whether they feel chest tightness, dizziness, or pain.
4. If medical emergency signs (chest pain, dizziness, severe pain, cannot breathe, numbness) -> resolved=true, context_tag="medical", strongly suggest seeking medical attention.
5. If the reply is sarcasm, frustration, or dismissive ("im fine stop bothering") -> resolved=true, context_tag="other", one-sentence acknowledgement and step back.

Always reply in English. Be concise (<=2 short sentences). You MUST return valid JSON in this exact shape:
{"reply":"<warm english reply>","resolved":true|false,"context_tag":"gaming|workout|work|stress|caffeine|startle|medical|other|null","free_text":"<verbatim user reply>"}`;

const UNITS = {
  heart_rate: 'bpm', resting_heart_rate: 'bpm', hrv_sdnn: 'ms',
  respiratory_rate: '/min', sleep_hours: 'hrs', sleep_efficiency: '',
  step_count: 'steps', active_energy: 'kcal', spo2: '%',
};

function fmtValue(metric, v) {
  if (v == null) return '—';
  if (metric === 'sleep_efficiency') return (Number(v) * 100).toFixed(0) + '%';
  if (metric === 'step_count' || metric === 'active_energy') return Math.round(v).toLocaleString();
  return Number(v).toFixed(1);
}

// Build a compact vitals snapshot for Kimi: TODAY's latest, 3-day trend, 7-day baseline.
async function buildVitalsBlock() {
  const now = new Date();
  const todayLabel = new Intl.DateTimeFormat('en-SG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Singapore',
  }).format(now);

  const out = { latest: {}, recent: {}, baseline: {} };

  // Latest + last-4-day samples per metric
  const metrics = Object.keys(UNITS);
  const since = new Date(Date.now() - 5 * 86400 * 1000).toISOString();
  try {
    const results = await Promise.all(metrics.map(m =>
      sbQuery('healthlog', `user_id=eq.${DEMO_USER}&metric=eq.${m}&ts=gte.${encodeURIComponent(since)}&select=ts,value&order=ts.desc&limit=4`)
    ));
    metrics.forEach((m, i) => {
      const rows = Array.isArray(results[i]) ? results[i] : [];
      if (rows[0]) out.latest[m] = rows[0];
      out.recent[m] = rows;
    });
  } catch { /* ok */ }

  try {
    const base = await sbQuery(
      'baseline',
      `user_id=eq.${DEMO_USER}&select=metric,baseline_mean,last_7d_mean,deviation_pct,status&order=updated_at.desc`
    );
    if (Array.isArray(base)) {
      for (const r of base) if (!out.baseline[r.metric]) out.baseline[r.metric] = r;
    }
  } catch { /* ok */ }

  const lines = [];
  lines.push(`--- Vitals snapshot · today is ${todayLabel} (Singapore) ---`);
  lines.push('Today\'s readings (from smartwatch):');
  for (const m of metrics) {
    const r = out.latest[m];
    if (!r) { lines.push(`  ${m}: (no sample today)`); continue; }
    const unit = UNITS[m] ? ' ' + UNITS[m] : '';
    lines.push(`  ${m}: ${fmtValue(m, r.value)}${unit}`);
  }
  lines.push('');
  lines.push('7-day mean vs 30-day baseline:');
  for (const m of metrics) {
    const r = out.baseline[m];
    if (!r) continue;
    const sign = r.deviation_pct >= 0 ? '+' : '';
    lines.push(`  ${m}: 7d=${r.last_7d_mean} baseline=${r.baseline_mean} (${sign}${r.deviation_pct}%, status=${r.status})`);
  }
  lines.push('--- End vitals ---');
  return lines.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  const message = typeof body.message === 'string' ? body.message : '';
  if (!message.trim()) {
    res.status(400).json({ error: 'message required' });
    return;
  }

  const KIMI_API_KEY = process.env.KIMI_API_KEY;
  const KIMI_MODEL = process.env.KIMI_MODEL || 'moonshot-v1-8k';

  if (!KIMI_API_KEY) {
    res.status(500).json({ error: 'KIMI_API_KEY not configured on server' });
    return;
  }

  // Persist the user message first (fire-and-forget but awaited for id).
  const userLog = await logMessage({
    state: 'user',
    free_text: message,
    context: { kind: 'reply_to_agent' },
  });

  // Pull live vitals so Kimi can actually answer "check my heart rate".
  const vitalsBlock = await buildVitalsBlock();
  const userContent = `${vitalsBlock}\n\nUser just said: ${message}`;

  const _ckey = costKey(req);
  {
    const _g = await checkCostGuard(_ckey, 'chat');
    if (!_g.ok) { res.status(429).json({ error: 'rate_limited', reason: _g.reason }); return; }
  }

  try {
    const upstream = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: KIMI_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      await logMessage({
        state: 'agent_error',
        free_text: `Upstream Kimi ${upstream.status}`,
        context: { kind: 'reply', error: detail.slice(0, 200) },
      });
      res.status(502).json({ error: `Moonshot ${upstream.status}`, detail: detail.slice(0, 400) });
      return;
    }

    const data = await upstream.json();
    recordTokens(_ckey, data?.usage?.total_tokens);
    const raw = data?.choices?.[0]?.message?.content ?? '';
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { parsed = { reply: raw || '…', resolved: false, context_tag: null, free_text: message }; }

    // Persist the agent reply.
    await logMessage({
      state: 'agent_reply',
      free_text: parsed.reply || '…',
      context_tag: parsed.context_tag && parsed.context_tag !== 'null' ? parsed.context_tag : null,
      context: { kind: 'reply', resolved: !!parsed.resolved, model: KIMI_MODEL, parent_user_log: userLog?.row?.id ?? null },
      resolved_at: parsed.resolved ? new Date().toISOString() : null,
    });

    res.status(200).json({
      ...parsed,
      model: KIMI_MODEL,
      path: 'Workato Recipe 8 · same system prompt',
    });
  } catch (e) {
    res.status(502).json({ error: 'upstream error', detail: String(e).slice(0, 300) });
  }
}
