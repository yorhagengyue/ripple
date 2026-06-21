// GET /api/discord?action=current|sessions|today&user=...&hours=...
//
// Consolidated discord read API — was 3 separate serverless functions
// (current / sessions / today), merged into one to stay under the Vercel Hobby
// 12-function limit. Reads the presence/session data that the
// scripts/discord-listener daemon writes into Supabase.
//   action=current  (default) → latest presence event + open sessions
//   action=sessions           → completed sessions in last N hours (?hours=24)
//   action=today              → per-activity totals for today (v_discord_today_totals)

import { sbQuery } from './_lib/supabase.js';

const VERBS = ['Playing', 'Streaming', 'Listening to', 'Watching', 'Custom', 'Competing in'];

async function current(user) {
  const events = await sbQuery(
    'discord_presence_events',
    `select=ts,status,active_devices,activities,discord_user_id&ripple_user_id=eq.${encodeURIComponent(user)}&order=ts.desc&limit=1`,
  );
  if (!events || !events.length) return { ok: true, user, presence: null, message: 'no events recorded yet' };
  const latest = events[0];
  const open_sessions = (latest.activities || []).map((a) => ({
    name: a.name,
    type: a.type,
    type_label: VERBS[a.type] || `T${a.type}`,
    started_at: a.started_at,
    duration_sec: a.started_at ? Math.floor((Date.now() - new Date(a.started_at).getTime()) / 1000) : null,
    details: a.details,
    state: a.state,
  }));
  return {
    ok: true, user,
    discord_user_id: latest.discord_user_id,
    last_event_at: latest.ts,
    status: latest.status,
    active_devices: latest.active_devices,
    open_sessions,
  };
}

async function sessions(user, hours) {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const rows = await sbQuery(
    'discord_sessions',
    `select=*&ripple_user_id=eq.${encodeURIComponent(user)}&started_at=gte.${since}&order=started_at.desc&limit=200`,
  );
  return {
    ok: true, user, window_hours: hours, since,
    sessions: (rows || []).map((r) => ({
      activity: r.activity_name,
      type: r.activity_type,
      type_label: VERBS[r.activity_type] || `T${r.activity_type}`,
      started_at: r.started_at,
      ended_at: r.ended_at,
      duration_sec: Math.round(r.duration_ms / 1000),
      duration_min: Math.round(r.duration_ms / 60000),
      source: r.source,
      details: r.details,
      state: r.state,
    })),
  };
}

async function today(user) {
  const rows = await sbQuery(
    'v_discord_today_totals',
    `select=*&ripple_user_id=eq.${encodeURIComponent(user)}&order=total_seconds.desc`,
  );
  return {
    ok: true, user, date: new Date().toISOString().slice(0, 10),
    totals: (rows || []).map((r) => ({
      activity: r.activity_name,
      type: r.activity_type,
      type_label: VERBS[r.activity_type] || `T${r.activity_type}`,
      total_seconds: Number(r.total_seconds),
      total_minutes: Math.round(Number(r.total_seconds) / 60),
      session_count: r.session_count,
      first_started: r.first_started,
      last_ended: r.last_ended,
    })),
  };
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const q = req.query || {};
  const user = q.user || 'demo';
  const action = q.action || 'current';
  try {
    let out;
    if (action === 'sessions') out = await sessions(user, Number(q.hours) || 24);
    else if (action === 'today') out = await today(user);
    else out = await current(user);
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e).slice(0, 300) });
  }
}
