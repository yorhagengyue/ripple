// /api/peer — single endpoint, action-based router (Hobby plan: ≤12 functions).
//
// Actions:
//   GET  /api/peer?action=auth          → check current session
//   POST /api/peer?action=auth          → exchange password for cookie
//   DELETE /api/peer?action=auth        → clear cookie
//   GET  /api/peer?action=profiles      → list profiles for dashboard (auth)
//   GET  /api/peer?action=messages&profile=X[&since_id=N&raw=1]  → list messages (auth)

import {
  checkPassword, issueCookie, getCookieHeader, getClearCookieHeader,
  readCookieFromReq, verifyCookie,
} from './peer/_auth.js';

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;

async function sbQuery(path) {
  if (!URL || !KEY) return null;
  const r = await fetch(`${URL}${path}`, {
    headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) return null;
  return r.json();
}

async function sbCount(path) {
  if (!URL || !KEY) return 0;
  const r = await fetch(`${URL}${path}`, {
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, prefer: 'count=exact' },
    method: 'HEAD',
  });
  if (!r.ok) return 0;
  const cr = r.headers.get('content-range') || '';
  const m = cr.match(/\/(\d+)$/);
  return m ? Number(m[1]) : 0;
}

function requireAuth(req, res) {
  const token = readCookieFromReq(req);
  if (!verifyCookie(token)) {
    res.status(401).json({ error: 'unauthenticated' });
    return false;
  }
  return true;
}

// === Auth handlers ===

async function handleAuthGet(req, res) {
  const token = readCookieFromReq(req);
  return res.status(200).json({ authenticated: verifyCookie(token) });
}

async function handleAuthPost(req, res) {
  let password = '';
  try {
    if (typeof req.body === 'object' && req.body !== null) {
      password = req.body.password || '';
    } else if (typeof req.body === 'string') {
      const j = JSON.parse(req.body);
      password = j.password || '';
    }
  } catch {
    return res.status(400).json({ error: 'invalid body' });
  }
  if (!checkPassword(password)) {
    await new Promise(r => setTimeout(r, 500));
    return res.status(401).json({ error: 'wrong password' });
  }
  const token = issueCookie();
  res.setHeader('Set-Cookie', getCookieHeader(token));
  return res.status(200).json({ ok: true });
}

async function handleAuthDelete(req, res) {
  res.setHeader('Set-Cookie', getClearCookieHeader());
  return res.status(200).json({ ok: true });
}

// === Profiles handler ===

async function handleProfiles(req, res) {
  if (!requireAuth(req, res)) return;
  const meta = await sbQuery('/rest/v1/profile_meta?select=*&order=display_name');
  if (!meta) return res.status(500).json({ error: 'supabase unreachable' });

  const profiles = await Promise.all(meta.map(async (m) => {
    const latest = (await sbQuery(
      `/rest/v1/profile_messages?profile=eq.${m.profile}&role=in.(user,assistant)&order=ts.desc&limit=1&select=ts,role,content`,
    ) || [])[0];
    const count = await sbCount(`/rest/v1/profile_messages?profile=eq.${m.profile}&role=in.(user,assistant)&select=id`);
    return {
      profile: m.profile,
      display_name: m.display_name,
      avatar: m.avatar,
      description: m.description,
      chat_id: m.chat_id || null,
      last_message_ts: latest?.ts || null,
      last_message_role: latest?.role || null,
      last_message_preview: latest?.content ? String(latest.content).slice(0, 60) : null,
      message_count: count,
    };
  }));
  return res.status(200).json({ profiles });
}

// === Messages handler ===

async function handleMessages(req, res) {
  if (!requireAuth(req, res)) return;
  const profile = (req.query.profile || '').replace(/[^a-z0-9_-]/gi, '');
  if (!profile) return res.status(400).json({ error: 'profile required' });
  const sinceId = parseInt(req.query.since_id || '0', 10);
  const limit = Math.min(parseInt(req.query.limit || '200', 10), 500);
  const includeRaw = req.query.raw === '1';
  const roleFilter = includeRaw ? '' : '&role=in.(user,assistant)';
  const path = `/rest/v1/profile_messages?profile=eq.${profile}&source_id=gt.${sinceId}${roleFilter}&order=source_id.asc&limit=${limit}&select=*`;
  try {
    const r = await fetch(`${URL}${path}`, {
      headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(500).json({ error: 'supabase error', detail: text.slice(0, 300) });
    }
    const rows = await r.json();
    return res.status(200).json({ messages: rows, count: rows.length });
  } catch (e) {
    return res.status(500).json({ error: String(e).slice(0, 300) });
  }
}

// === Intervene handler (human-as-bot) ===

async function handleIntervene(req, res) {
  if (!requireAuth(req, res)) return;
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  const profile = String(body.profile || '').replace(/[^a-z0-9_-]/gi, '');
  const chat_id = String(body.chat_id || '').trim();
  const message = String(body.message || '');
  if (!profile) return res.status(400).json({ error: 'profile required' });
  if (!chat_id) return res.status(400).json({ error: 'chat_id required' });
  if (!message.trim()) return res.status(400).json({ error: 'message required' });
  if (message.length > 4000) return res.status(400).json({ error: 'message too long (max 4000)' });

  // Insert into bot_send_queue; the local profile_sync daemon polls this
  // table every ~3s and dispatches to send_weixin.py with --injected.
  try {
    const r = await fetch(`${URL}/rest/v1/bot_send_queue`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        authorization: `Bearer ${KEY}`,
        'content-type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ profile, chat_id, message, status: 'pending' }),
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(500).json({ error: 'queue insert failed', detail: text.slice(0, 300) });
    }
    const rows = await r.json();
    return res.status(202).json({ queued: true, id: rows[0]?.id });
  } catch (e) {
    return res.status(500).json({ error: String(e).slice(0, 300) });
  }
}

// === Router ===

export default async function handler(req, res) {
  const action = (req.query.action || '').toString();
  const method = req.method.toUpperCase();

  try {
    if (action === 'auth') {
      if (method === 'GET') return handleAuthGet(req, res);
      if (method === 'POST') return handleAuthPost(req, res);
      if (method === 'DELETE') return handleAuthDelete(req, res);
      return res.status(405).json({ error: 'method not allowed' });
    }
    if (action === 'profiles') {
      if (method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
      return handleProfiles(req, res);
    }
    if (action === 'messages') {
      if (method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
      return handleMessages(req, res);
    }
    if (action === 'intervene') {
      if (method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
      return handleIntervene(req, res);
    }
    return res.status(400).json({ error: 'unknown action', valid: ['auth', 'profiles', 'messages', 'intervene'] });
  } catch (e) {
    return res.status(500).json({ error: String(e).slice(0, 300) });
  }
}
