// GET    /api/chat/history?since=<ISO>&limit=100  → list messages
// DELETE /api/chat/history                          → clear all messages for DEMO_USER

import { sbQuery, DEMO_USER } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'GET')    return handleGet(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  res.status(405).json({ error: 'GET or DELETE only' });
}

async function handleGet(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const since = url.searchParams.get('since');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);

  const parts = [
    `user_id=eq.${DEMO_USER}`,
    `select=id,state,free_text,context_tag,context,triggered_at,resolved_at`,
    `order=triggered_at.asc`,
    `limit=${limit}`,
  ];
  if (since) parts.push(`triggered_at=gt.${encodeURIComponent(since)}`);

  const rows = await sbQuery('alert_sessions', parts.join('&'));
  if (!Array.isArray(rows)) {
    res.status(502).json({ error: 'supabase fetch failed' });
    return;
  }
  res.status(200).json({ messages: rows, fetched_at: new Date().toISOString() });
}

// Hard-delete all alert_sessions rows for DEMO_USER.
// Service-role key so this bypasses RLS.
async function handleDelete(_req, res) {
  const URL_ = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const KEY  = process.env.SUPABASE_SECRET_KEY;
  if (!URL_ || !KEY) {
    res.status(500).json({ error: 'Supabase service-role env not configured' });
    return;
  }
  try {
    const r = await fetch(`${URL_}/rest/v1/alert_sessions?user_id=eq.${DEMO_USER}`, {
      method: 'DELETE',
      headers: {
        apikey: KEY,
        authorization: `Bearer ${KEY}`,
        prefer: 'return=representation',
      },
    });
    if (!r.ok) {
      const detail = await r.text();
      res.status(502).json({ error: `supabase ${r.status}`, detail: detail.slice(0, 300) });
      return;
    }
    const deleted = await r.json().catch(() => []);
    res.status(200).json({
      deleted_count: Array.isArray(deleted) ? deleted.length : 0,
      cleared_at: new Date().toISOString(),
      user_id: DEMO_USER,
    });
  } catch (e) {
    res.status(502).json({ error: 'delete failed', detail: String(e).slice(0, 300) });
  }
}
