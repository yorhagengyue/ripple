// POST /api/chat/explain — explain ONE tapped metric in context of the other three.
// Fetches real 14-day healthlog + 30-day baseline for all four metrics, sends
// everything to Kimi, returns a three-paragraph prose explanation.

import { sbQuery, DEMO_USER } from '../_lib/supabase.js';

const METRIC_LABELS = {
  hrv_sdnn:   'Heart rate variability',
  heart_rate: 'Heart rate',
  sleep_hours: 'Sleep hours',
  step_count: 'Daily steps',
};

const UNIT = {
  hrv_sdnn: 'ms', heart_rate: 'bpm', sleep_hours: 'hrs', step_count: '',
};
const DEC = {
  hrv_sdnn: 1, heart_rate: 0, sleep_hours: 1, step_count: 0,
};

const SYSTEM_PROMPT = `You are Ripple, a warm wellness companion. The user has tapped ONE metric on a 14-day chart.

Write ONE short paragraph. Maximum 3 sentences, under 60 words total. No bullets, no headers, no markdown, no emoji.

Sentence 1 — what the tapped metric is in plain English.
Sentence 2 — how its 14-day trend correlates with at least two OTHER named metrics in the data, using the actual numbers.
Sentence 3 (optional) — one line naming the pattern (autonomic stress, early burnout signature, recovery drift). No diagnosis language.

Always English.`;

function summarise(label, log, base, unit, dec) {
  if (!Array.isArray(log) || !log.length) return `${label}: (no samples)`;
  const first = log[0]?.value;
  const last  = log[log.length - 1]?.value;
  const pct = (first && first !== 0) ? 100 * (last - first) / first : 0;
  const sign = pct >= 0 ? '+' : '';
  const baseMean = Array.isArray(base) && base[0]?.baseline_mean != null ? Number(base[0].baseline_mean).toFixed(dec) : '—';
  const u = unit ? ' ' + unit : '';
  const todayV = Number(last).toFixed(dec);
  const startV = Number(first).toFixed(dec);
  return `${label}: ${startV}${u} (start) → ${todayV}${u} (today), ${sign}${pct.toFixed(1)}% over window; 30-day baseline ${baseMean}${u}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  const metric = String(body.metric || '').trim();
  if (!METRIC_LABELS[metric]) {
    res.status(400).json({ error: 'unknown metric', metric });
    return;
  }

  const KIMI_API_KEY = process.env.KIMI_API_KEY;
  const KIMI_MODEL = process.env.KIMI_MODEL || 'moonshot-v1-8k';
  if (!KIMI_API_KEY) {
    res.status(500).json({ error: 'KIMI_API_KEY not configured' });
    return;
  }

  // Pull 14-day log + baseline for all four metrics in parallel.
  const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
  const metrics = Object.keys(METRIC_LABELS);

  const [logs, bases] = await Promise.all([
    Promise.all(metrics.map(m =>
      sbQuery('healthlog', `user_id=eq.${DEMO_USER}&metric=eq.${m}&ts=gte.${since}&select=ts,value&order=ts.asc&limit=500`)
    )),
    Promise.all(metrics.map(m =>
      sbQuery('baseline', `user_id=eq.${DEMO_USER}&metric=eq.${m}&select=baseline_mean,last_7d_mean,deviation_pct,status&order=updated_at.desc&limit=1`)
    )),
  ]);

  const byMetric = {};
  metrics.forEach((m, i) => { byMetric[m] = { log: logs[i], base: bases[i] }; });

  const dataLines = metrics.map(m => summarise(METRIC_LABELS[m], byMetric[m].log, byMetric[m].base, UNIT[m], DEC[m]));

  const userMsg = [
    `Tapped metric: ${METRIC_LABELS[metric]}`,
    '',
    'Fourteen-day data for this user:',
    ...dataLines,
    '',
    `Explain the tapped metric and correlate with the others.`,
  ].join('\n');

  try {
    const upstream = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        temperature: 0.35,
        max_tokens: 160,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMsg },
        ],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      res.status(502).json({ error: `Moonshot ${upstream.status}`, detail: detail.slice(0, 400) });
      return;
    }

    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    res.status(200).json({ content, metric, model: KIMI_MODEL, generated_at: new Date().toISOString() });
  } catch (e) {
    res.status(502).json({ error: 'upstream error', detail: String(e).slice(0, 300) });
  }
}
