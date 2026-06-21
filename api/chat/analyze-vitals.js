// POST /api/chat/analyze-vitals — given a vitals snapshot (as fetched from the
// native /api/mcp get_current_vitals tool → Supabase), have Kimi produce a short
// human-readable read. Shown as an assistant bubble in the Chat page.

import { costKey, checkCostGuard, recordTokens } from '../_lib/cost-guard.js';

const SYSTEM_PROMPT = `You are Ripple, a warm wellness companion reading a live Apple Watch snapshot.

You receive a JSON list of vitals freshly pulled from the user's Supabase healthlog. Each row has: metric, value, ts, source.

Write THREE short paragraphs, each on its own line, separated by blank lines. No bullets, no headers, no markdown, no emoji. Total under 140 words.

Paragraph 1 — What stands out right now. Quote at most two metric values with their numbers. Flag anything unusual (heart rate far from typical resting, HRV depressed, oxygen low, sleep too short).
Paragraph 2 — Correlation read: how two or three metrics together suggest a pattern (autonomic stress, under-recovery, solid baseline, active afternoon, etc.). Use actual numbers.
Paragraph 3 — One concrete observational suggestion. No diagnosis language. No clinical claims. Always frame as observation, not instruction.

Always English.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const KIMI_API_KEY = process.env.KIMI_API_KEY;
  const KIMI_MODEL = process.env.KIMI_MODEL || 'moonshot-v1-8k';
  if (!KIMI_API_KEY) {
    res.status(500).json({ error: 'KIMI_API_KEY not configured' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== 'object') body = {};

  const vitalsRaw = Array.isArray(body.vitals) ? body.vitals : [];
  if (!vitalsRaw.length) {
    res.status(400).json({ error: 'missing vitals[]' });
    return;
  }

  // Keep only the fields Kimi needs; cap at 20 rows so prompt stays small.
  const vitals = vitalsRaw.slice(0, 20).map((v) => ({
    metric: String(v.metric ?? '').slice(0, 40),
    value:  typeof v.value === 'number' ? v.value : (v.value === '' ? null : v.value),
    ts:     String(v.ts ?? '').slice(0, 40),
    source: String(v.source ?? '').slice(0, 40),
  }));

  const userMsg = [
    `Live vitals for this user, fetched just now from Supabase healthlog (get_current_vitals):`,
    '',
    '```json',
    JSON.stringify(vitals, null, 2),
    '```',
    '',
    'Now: read the snapshot and respond in three short paragraphs.',
  ].join('\n');

  const started = Date.now();
  try {
    const _ckey = costKey(req);
    const _g = await checkCostGuard(_ckey, 'analyze');
    if (!_g.ok) { res.status(429).json({ error: 'rate_limited', reason: _g.reason }); return; }
    const upstream = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        temperature: 0.35,
        max_tokens: 320,
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
    recordTokens(_ckey, data?.usage?.total_tokens);
    const content = data?.choices?.[0]?.message?.content ?? '';
    res.status(200).json({
      content,
      model: KIMI_MODEL,
      row_count: vitals.length,
      elapsed_ms: Date.now() - started,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    res.status(502).json({ error: 'upstream error', detail: String(e).slice(0, 300) });
  }
}
