// GET /api/discord/sessions?user=tommychen030607&hours=24
//
// Returns completed activity sessions in the last N hours (default 24).

import {sbQuery} from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const user = req.query?.user || 'tommychen030607';
  const hours = Number(req.query?.hours) || 24;

  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const rows = await sbQuery(
    'discord_sessions',
    `select=*&ripple_user_id=eq.${encodeURIComponent(user)}&started_at=gte.${since}&order=started_at.desc&limit=200`,
  );

  const verbs = ['Playing', 'Streaming', 'Listening to', 'Watching', 'Custom', 'Competing in'];

  res.status(200).json({
    ok: true,
    user,
    window_hours: hours,
    since,
    sessions: (rows || []).map((r) => ({
      activity: r.activity_name,
      type: r.activity_type,
      type_label: verbs[r.activity_type] || `T${r.activity_type}`,
      started_at: r.started_at,
      ended_at: r.ended_at,
      duration_sec: Math.round(r.duration_ms / 1000),
      duration_min: Math.round(r.duration_ms / 60000),
      source: r.source,
      details: r.details,
      state: r.state,
    })),
  });
}
