// Vercel Serverless Function — POST /api/chat/nudge
// Generates a proactive check-in via Kimi, persists it into alert_sessions.
// Two ways to call:
//   1. Browser (no auth) — the client hits this on a timer / on load
//   2. External cron (cron-job.org / Workato) — include header `x-nudge-secret: <NUDGE_SECRET>`
//      This is the tab-independent mode you want for real scheduled pushes.

import { logMessage, sbQuery, DEMO_USER } from '../_lib/supabase.js';
import webpush from 'web-push';
import { costKey, checkCostGuard, recordTokens } from '../_lib/cost-guard.js';

const VAPID_PUBLIC  = process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:ripple@example.com';
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

// Fire Web Push notifications to every subscriber for the user.
// Drops expired/invalid subscriptions as a side effect.
async function sendPushToAll(userId, payload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { sent: 0, reason: 'vapid not configured' };
  const subs = await sbQuery('push_subscriptions', `user_id=eq.${userId}&select=endpoint,p256dh,auth`);
  if (!Array.isArray(subs) || !subs.length) return { sent: 0 };

  const URL_ = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const KEY  = process.env.SUPABASE_SECRET_KEY;

  const results = await Promise.allSettled(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 300 } // drop if not delivered in 5 min
      );
      return { ok: true };
    } catch (err) {
      // 404 / 410 = subscription expired — remove it
      const code = err?.statusCode;
      if ((code === 404 || code === 410) && URL_ && KEY) {
        await fetch(`${URL_}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(s.endpoint)}`, {
          method: 'DELETE',
          headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
        }).catch(() => {});
      }
      return { ok: false, code, message: String(err?.message || err).slice(0, 120) };
    }
  }));
  const sent = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
  return { sent, total: subs.length };
}

const NUDGE_SYSTEM_PROMPT = `You are Ripple, a warm, quietly attentive cardiovascular wellness agent. Every five minutes you send ONE short proactive check-in to the user — 1 to 2 sentences, never more.

Rules:
- Metric priority: ALWAYS prefer cardiovascular signals first. Check heart_rate and hrv_sdnn before anything else. Only fall back to sleep / energy / steps when both heart_rate and hrv_sdnn are in 'normal' status.
- Pick ONE specific observation and name the metric that drew your attention. Quote the actual number with its timestamp phrasing.
- **Time phrasing matters.** The data block tells you how fresh each reading is:
    • INSTANTANEOUS metrics (heart_rate, hrv_sdnn, resting_heart_rate, spo2, respiratory_rate) are point-in-time reads. Use "right now", "just now", "X minutes ago", or the explicit timestamp. **Never say "today" or "this week" for these.**
    • CUMULATIVE metrics (step_count, active_energy, sleep_hours, sleep_efficiency) are running totals or last-night summaries. "Today so far" or "last night" is correct.
- Warmth without emoji. No exclamation marks. No "Hey!" / "Hi there!". Start with the observation or a gentle question.
- If heart_rate / hrv_sdnn are both normal and nothing cardiac stands out, say that plainly, then ask an open cardiovascular-framed question (recovery, caffeine, resting periods).
- End with an invitation to talk — "want to talk it through?" style — without being needy.
- Always English.
- Set vital_cue to the metric you picked (e.g., "heart_rate", "hrv_sdnn").
- Return ONLY valid JSON: {"content":"<message>","vital_cue":"<metric name or null>","event_note":"<short system hint or null>"}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const KIMI_API_KEY = process.env.KIMI_API_KEY;
  const KIMI_MODEL = process.env.KIMI_MODEL || 'moonshot-v1-8k';
  const NUDGE_SECRET = process.env.NUDGE_SECRET || '';

  if (!KIMI_API_KEY) {
    res.status(500).json({ error: 'KIMI_API_KEY not configured' });
    return;
  }

  // External cron path: require secret header
  const fromCron = !!NUDGE_SECRET && req.headers['x-nudge-secret'] === NUDGE_SECRET;
  // If NUDGE_SECRET isn't set, allow anonymous browser calls. If it is set,
  // unauth calls still work (browser) but flag them as non-cron.
  // (Anonymity is OK here because the endpoint's only power is spending a Kimi token.)

  // ----- Build vitals context — freshest per-metric reading via v_latest_per_metric view,
  //       7-day baseline, 3-day trend direction. Annotate each line with freshness
  //       so Kimi can pick the right tense ("right now" vs "today so far" vs "last night").
  const PRIMARY = new Set(['heart_rate', 'hrv_sdnn']);
  const METRIC_NAMES = ['heart_rate', 'hrv_sdnn', 'respiratory_rate', 'resting_heart_rate',
                        'sleep_hours', 'sleep_efficiency', 'step_count', 'active_energy', 'spo2'];
  // Instantaneous: a point-in-time window. "right now" / "X min ago" phrasing.
  const INSTANTANEOUS = new Set(['heart_rate', 'hrv_sdnn', 'resting_heart_rate', 'spo2', 'respiratory_rate']);
  // Cumulative: a running daily total or a whole-night summary.
  const CUMULATIVE = new Set(['step_count', 'active_energy', 'sleep_hours', 'sleep_efficiency']);

  const now = new Date();
  const nowMs = now.getTime();
  const sgDate = new Intl.DateTimeFormat('en-SG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Singapore',
  }).format(now);
  const sgTime = new Intl.DateTimeFormat('en-SG', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore',
  }).format(now);

  // Parallel fetches: latest-per-metric view, baseline table, 3-day window for trend.
  const latestP = sbQuery(
    'v_latest_per_metric',
    `user_id=eq.${DEMO_USER}&select=metric,ts,value,min_val,max_val,source`
  );
  const baselineRowsP = sbQuery(
    'baseline',
    `user_id=eq.${DEMO_USER}&select=metric,baseline_mean,last_7d_mean,deviation_pct,status&order=updated_at.desc`
  );
  const since3d = new Date(nowMs - 3 * 86400 * 1000).toISOString();
  const recentP = Promise.all(METRIC_NAMES.map(m =>
    sbQuery('healthlog', `user_id=eq.${DEMO_USER}&metric=eq.${m}&ts=gte.${encodeURIComponent(since3d)}&select=ts,value&order=ts.desc&limit=6`)
  ));
  const [latestRows, baselineRows, recentArrays] = await Promise.all([latestP, baselineRowsP, recentP]);

  const latestByMetric = {};
  if (Array.isArray(latestRows)) {
    for (const r of latestRows) if (!latestByMetric[r.metric]) latestByMetric[r.metric] = r;
  }
  const byMetric = {};
  if (Array.isArray(baselineRows)) {
    for (const r of baselineRows) if (!byMetric[r.metric]) byMetric[r.metric] = r;
  }
  const recent = {};
  METRIC_NAMES.forEach((m, i) => { recent[m] = Array.isArray(recentArrays[i]) ? recentArrays[i] : []; });

  function fmt(metric, v) {
    if (v == null || v === '') return '—';
    if (metric === 'sleep_efficiency') return (Number(v) * 100).toFixed(0) + '%';
    if (metric === 'step_count' || metric === 'active_energy') return Math.round(v).toLocaleString();
    return Number(v).toFixed(1);
  }
  function unitOf(metric) {
    return ({
      heart_rate: 'bpm', resting_heart_rate: 'bpm',
      hrv_sdnn: 'ms', respiratory_rate: '/min',
      sleep_hours: 'hrs', sleep_efficiency: '',
      step_count: 'steps', active_energy: 'kcal', spo2: '%',
    })[metric] || '';
  }
  function freshnessPhrase(metric, tsIso) {
    if (!tsIso) return 'unknown';
    const age = nowMs - new Date(tsIso).getTime();
    const minutes = Math.round(age / 60000);
    if (INSTANTANEOUS.has(metric)) {
      if (minutes < 3)  return 'right now';
      if (minutes < 60) return `${minutes} min ago`;
      const hours = Math.round(minutes / 60);
      if (hours < 24)   return `${hours} h ago`;
      return `${Math.round(hours / 24)} d ago`;
    }
    // Cumulative
    if (metric === 'sleep_hours' || metric === 'sleep_efficiency') return 'last night';
    return 'today so far';
  }

  const lines = [];
  for (const m of METRIC_NAMES) {
    const live = latestByMetric[m];
    const base = byMetric[m];
    if (!live && !base) continue;
    const parts = [`${m}:`];
    if (live && live.value != null && live.value !== '') {
      const freshness = freshnessPhrase(m, live.ts);
      const valStr = `${fmt(m, live.value)}${unitOf(m) ? ' ' + unitOf(m) : ''}`;
      const kind = INSTANTANEOUS.has(m) ? '[INSTANT]' : CUMULATIVE.has(m) ? '[CUMUL]' : '';
      parts.push(`${valStr} (${freshness})`);
      if (kind) parts.push(kind);
    }
    if (base) {
      const sign = base.deviation_pct >= 0 ? '+' : '';
      parts.push(`(7d avg ${base.last_7d_mean}, ${sign}${base.deviation_pct}% vs 30d baseline, status=${base.status})`);
    }
    // 3-day direction
    const pts = (recent[m] || []).slice(0, 4).map(r => Number(r.value)).filter(Number.isFinite);
    if (pts.length >= 2) {
      const first = pts[pts.length - 1], last = pts[0];
      const dir = last > first * 1.015 ? 'trending UP' : last < first * 0.985 ? 'trending DOWN' : 'steady';
      parts.push(`— 3-day ${dir}`);
    }
    if (PRIMARY.has(m)) parts.push('[PRIMARY]');
    lines.push(parts.join(' '));
  }
  const vitalsBlock = lines.length ? lines.join('\n') : '(no vitals available)';

  const userBlock = [
    `Now: ${sgDate}, ${sgTime} Singapore time.`,
    `This user is recovering from a four-metric drift the watchdog flagged last week; you are the proactive nudge after the first intervention.`,
    '',
    'Fresh vitals snapshot. Each line has: latest value, freshness phrase, [INSTANT] or [CUMUL] tag, 7-day context, 3-day direction.',
    vitalsBlock,
    '',
    'Generate one short proactive check-in now. Match your tense to the freshness phrase — "right now" / "X min ago" for [INSTANT] metrics, "today so far" / "last night" for [CUMUL]. Do not collapse everything into "today".',
  ].join('\n');

  try {
    const _ckey = costKey(req);
    if (!fromCron) {
      const _g = await checkCostGuard(_ckey, 'nudge');
      if (!_g.ok) { res.status(429).json({ error: 'rate_limited', reason: _g.reason }); return; }
    }
    const upstream = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        temperature: 0.8,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: NUDGE_SYSTEM_PROMPT },
          { role: 'user', content: userBlock },
        ],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      res.status(502).json({ error: `Moonshot ${upstream.status}`, detail: detail.slice(0, 400) });
      return;
    }

    const data = await upstream.json();
    if (!fromCron) recordTokens(_ckey, data?.usage?.total_tokens);
    const raw = data?.choices?.[0]?.message?.content ?? '';
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { parsed = { content: raw || '…', vital_cue: null, event_note: null }; }

    // Persist nudge
    const log = await logMessage({
      state: 'nudge',
      free_text: parsed.content || '…',
      context_tag: null,
      context: {
        kind: 'proactive',
        vital_cue: parsed.vital_cue || null,
        event_note: parsed.event_note || null,
        model: KIMI_MODEL,
        origin: fromCron ? 'cron' : 'client',
      },
    });

    // Fan out Web Push to every subscribed device for this user.
    const push = await sendPushToAll(DEMO_USER, {
      title: 'Ripple',
      body: parsed.content || '…',
      url: '/chat',
      tag: 'ripple-nudge-' + (parsed.vital_cue || 'any'),
    });

    res.status(200).json({
      ...parsed,
      model: KIMI_MODEL,
      generated_at: new Date().toISOString(),
      persisted_id: log?.row?.id ?? null,
      origin: fromCron ? 'cron' : 'client',
      push,
    });
  } catch (e) {
    res.status(502).json({ error: 'upstream error', detail: String(e).slice(0, 300) });
  }
}
