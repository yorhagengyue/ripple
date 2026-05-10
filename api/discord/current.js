// GET /api/discord/current?user=tommychen030607
//
// Returns the most recent presence event + open sessions reconstructed from
// the events log. Used by frontend cards and by Workato MCP tools that need
// "right now" state.

import {sbQuery} from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const user = req.query?.user || req.url?.split('user=')[1]?.split('&')[0] || 'tommychen030607';

  // Latest event for this user
  const events = await sbQuery(
    'discord_presence_events',
    `select=ts,status,active_devices,activities,discord_user_id&ripple_user_id=eq.${encodeURIComponent(user)}&order=ts.desc&limit=1`,
  );
  if (!events || !events.length) {
    res.status(200).json({ok: true, user, presence: null, message: 'no events recorded yet'});
    return;
  }
  const latest = events[0];

  // Open sessions = activities currently in latest event
  const openSessions = (latest.activities || []).map((a) => ({
    name: a.name,
    type: a.type,
    type_label: ['Playing', 'Streaming', 'Listening to', 'Watching', 'Custom', 'Competing in'][a.type] || `T${a.type}`,
    started_at: a.started_at,
    duration_sec: a.started_at ? Math.floor((Date.now() - new Date(a.started_at).getTime()) / 1000) : null,
    details: a.details,
    state: a.state,
  }));

  res.status(200).json({
    ok: true,
    user,
    discord_user_id: latest.discord_user_id,
    last_event_at: latest.ts,
    status: latest.status,
    active_devices: latest.active_devices,
    open_sessions: openSessions,
  });
}
