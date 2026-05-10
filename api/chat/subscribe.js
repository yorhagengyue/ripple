// POST   /api/chat/subscribe    → register a Web Push subscription for DEMO_USER
// DELETE /api/chat/subscribe    → remove a subscription by endpoint
//
// Writes to `push_subscriptions` (see schema in README).

import { DEMO_USER } from '../_lib/supabase.js';

const URL_ = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SECRET_KEY;

export default async function handler(req, res) {
  if (!URL_ || !KEY) {
    res.status(500).json({ error: 'Supabase service-role env not configured' });
    return;
  }
  if (req.method === 'POST')   return subscribe(req, res);
  if (req.method === 'DELETE') return unsubscribe(req, res);
  res.status(405).json({ error: 'POST or DELETE only' });
}

async function subscribe(req, res) {
  const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  const { endpoint, keys, user_agent } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'endpoint + keys.p256dh + keys.auth required' });
    return;
  }

  // Upsert: dedup by endpoint (must have UNIQUE constraint in SQL).
  try {
    const r = await fetch(`${URL_}/rest/v1/push_subscriptions?on_conflict=endpoint`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        authorization: `Bearer ${KEY}`,
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        user_id: DEMO_USER,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: user_agent || null,
      }),
    });
    if (!r.ok) {
      const detail = await r.text();
      res.status(502).json({ error: `supabase ${r.status}`, detail: detail.slice(0, 300) });
      return;
    }
    const row = await r.json().catch(() => null);
    res.status(200).json({ ok: true, subscription_id: Array.isArray(row) ? row[0]?.id : null });
  } catch (e) {
    res.status(502).json({ error: 'subscribe failed', detail: String(e).slice(0, 300) });
  }
}

async function unsubscribe(req, res) {
  const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  const { endpoint } = body;
  if (!endpoint) {
    res.status(400).json({ error: 'endpoint required' });
    return;
  }
  try {
    const r = await fetch(`${URL_}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
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
    res.status(200).json({ ok: true, removed: Array.isArray(deleted) ? deleted.length : 0 });
  } catch (e) {
    res.status(502).json({ error: 'unsubscribe failed', detail: String(e).slice(0, 300) });
  }
}
