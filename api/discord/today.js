// GET /api/discord/today?user=tommychen030607
//
// Returns total time per activity for today (since 00:00 local UTC).
// Driven by the v_discord_today_totals view in Supabase.

import {sbQuery} from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const user = req.query?.user || req.url?.split('user=')[1]?.split('&')[0] || 'tommychen030607';

  const rows = await sbQuery(
    'v_discord_today_totals',
    `select=*&ripple_user_id=eq.${encodeURIComponent(user)}&order=total_seconds.desc`,
  );

  const verbs = ['Playing', 'Streaming', 'Listening to', 'Watching', 'Custom', 'Competing in'];

  res.status(200).json({
    ok: true,
    user,
    date: new Date().toISOString().slice(0, 10),
    totals: (rows || []).map((r) => ({
      activity: r.activity_name,
      type: r.activity_type,
      type_label: verbs[r.activity_type] || `T${r.activity_type}`,
      total_seconds: Number(r.total_seconds),
      total_minutes: Math.round(Number(r.total_seconds) / 60),
      session_count: r.session_count,
      first_started: r.first_started,
      last_ended: r.last_ended,
    })),
  });
}
