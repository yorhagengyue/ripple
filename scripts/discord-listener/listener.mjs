// Ripple · Discord presence listener
//
// Long-running process. Connects to Lanyard's WebSocket, subscribes to all
// Discord users registered in the `discord_user_link` Supabase table, and
// writes:
//   - every distinct presence change → discord_presence_events
//   - every completed activity session → discord_sessions
//
// Run:
//   cd <repo root>
//   node scripts/discord-listener/listener.mjs
//
// To run as a daemon, see scripts/discord-listener/com.ripple.discord-listener.plist

import WebSocket from 'ws';
import {appendFileSync, mkdirSync, existsSync, readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

// ──────────────── env loader ────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const SUPA_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

// ──────────────── tiny supabase rest client ────────────────
async function sbInsert(table, row) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY,
      authorization: `Bearer ${SUPA_KEY}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) {
    log(`  ⚠ supabase insert ${table} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return false;
  }
  return true;
}

async function sbSelect(table, qs = '') {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`, {
    headers: {apikey: SUPA_KEY, authorization: `Bearer ${SUPA_KEY}`},
  });
  if (!r.ok) throw new Error(`supabase select ${table} ${r.status}: ${await r.text()}`);
  return r.json();
}

// ──────────────── logging ────────────────
const LOG_DIR = join(__dirname, 'data');
mkdirSync(LOG_DIR, {recursive: true});
const LOG_FILE = join(LOG_DIR, 'listener.log');

const ts = () => new Date().toISOString();
function log(msg) {
  const line = `[${ts()}] ${msg}`;
  console.log(line);
  try { appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

// ──────────────── per-user state ────────────────
// uid → { rippleUserId, username, status, openSessions: Map<key,{name,type,start,source}>, lastKey }
const state = new Map();
let userMap = new Map(); // discord_user_id → ripple_user_id

function snapshotKey(p) {
  return JSON.stringify({
    s: p.discord_status,
    a: (p.activities || []).filter((a) => a.type !== 4).map((a) => ({n: a.name, t: a.type, st: a.timestamps?.start || null})),
  });
}

async function processPresence(uid, presence) {
  const rippleUserId = userMap.get(uid);
  if (!rippleUserId) {
    log(`  unknown uid=${uid}, skip`);
    return;
  }

  const username = presence.discord_user?.username || '';
  const status = presence.discord_status;
  const activities = (presence.activities || []).filter((a) => a.type !== 4);

  let s = state.get(uid);
  if (!s) {
    s = {rippleUserId, username, status: null, openSessions: new Map(), lastKey: null};
    state.set(uid, s);
  }
  s.username = username;
  const key = snapshotKey(presence);
  if (key === s.lastKey) return;
  s.lastKey = key;

  // 1) raw event row
  const eventRow = {
    ripple_user_id: rippleUserId,
    discord_user_id: uid,
    ts: ts(),
    status,
    active_devices: {
      desktop: presence.active_on_discord_desktop,
      mobile: presence.active_on_discord_mobile,
      web: presence.active_on_discord_web,
      embedded: presence.active_on_discord_embedded,
      vr: presence.active_on_discord_vr,
    },
    activities: activities.map((a) => ({
      name: a.name, type: a.type,
      details: a.details || null, state: a.state || null,
      started_at: a.timestamps?.start ? new Date(a.timestamps.start).toISOString() : null,
      ended_at: a.timestamps?.end ? new Date(a.timestamps.end).toISOString() : null,
    })),
  };
  await sbInsert('discord_presence_events', eventRow);

  // 2) session diff — open new, close gone
  const presentKeys = new Set();
  for (const a of activities) {
    const k = `${a.name}|${a.type}`;
    presentKeys.add(k);
    if (!s.openSessions.has(k)) {
      const start = a.timestamps?.start || Date.now();
      s.openSessions.set(k, {
        name: a.name, type: a.type, start,
        source: a.timestamps?.start ? 'discord_ts' : 'observed',
        details: a.details || null, state: a.state || null,
      });
      log(`▶ ${username} START "${a.name}" (type ${a.type})`);
    }
  }
  for (const [k, sess] of s.openSessions) {
    if (presentKeys.has(k)) continue;
    const end = Date.now();
    const durMs = end - sess.start;
    const ok = await sbInsert('discord_sessions', {
      ripple_user_id: s.rippleUserId,
      discord_user_id: uid,
      activity_name: sess.name,
      activity_type: sess.type,
      started_at: new Date(sess.start).toISOString(),
      ended_at: new Date(end).toISOString(),
      duration_ms: durMs,
      source: sess.source,
      details: sess.details,
      state: sess.state,
    });
    log(`■ ${username} END   "${sess.name}" — ${(durMs / 1000).toFixed(0)}s ${ok ? '✓saved' : '✗fail'}`);
    s.openSessions.delete(k);
  }

  if (s.status !== status) {
    log(`◆ ${username} status ${s.status || '(initial)'} → ${status}`);
    s.status = status;
  }
}

// ──────────────── socket ────────────────
let ws = null;
let hb = null;

function connect(ids) {
  ws = new WebSocket('wss://api.lanyard.rest/socket');
  ws.on('open', () => {
    log(`connected · subscribing to ${ids.length} id(s)`);
  });
  ws.on('message', async (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    if (m.op === 1) {
      hb = setInterval(() => ws?.readyState === 1 && ws.send(JSON.stringify({op: 3})), m.d.heartbeat_interval);
      const payload = ids.length === 1 ? {op: 2, d: {subscribe_to_id: ids[0]}} : {op: 2, d: {subscribe_to_ids: ids}};
      ws.send(JSON.stringify(payload));
    } else if (m.op === 0 && m.t === 'INIT_STATE') {
      const data = m.d;
      if (ids.length === 1) await processPresence(ids[0], data);
      else for (const uid of Object.keys(data)) await processPresence(uid, data[uid]);
    } else if (m.op === 0 && m.t === 'PRESENCE_UPDATE') {
      const uid = m.d.discord_user?.id;
      if (uid) await processPresence(uid, m.d);
    }
  });
  ws.on('close', (code) => {
    log(`socket closed (${code}), reconnect in 3s`);
    clearInterval(hb);
    setTimeout(() => connect(ids), 3000);
  });
  ws.on('error', (err) => log(`socket error: ${err.message}`));
}

// ──────────────── boot ────────────────
async function main() {
  log(`listener pid=${process.pid} · loading user map from supabase`);
  const links = await sbSelect('discord_user_link', 'select=ripple_user_id,discord_user_id,discord_username&active=eq.true');
  if (!links.length) {
    log('no rows in discord_user_link — exiting');
    process.exit(1);
  }
  for (const row of links) {
    userMap.set(row.discord_user_id, row.ripple_user_id);
    log(`  ↳ ${row.ripple_user_id} → ${row.discord_user_id} (${row.discord_username})`);
  }
  const ids = [...userMap.keys()];
  connect(ids);

  // Heartbeat to log every 10 min
  setInterval(() => {
    const summary = [...state.values()].map((s) => {
      const open = [...s.openSessions.values()].map((v) => v.name).join(',') || '-';
      return `${s.username}=${s.status}(${open})`;
    }).join(' | ');
    log(`alive · ${summary || 'no users yet'}`);
  }, 10 * 60 * 1000);
}

main().catch((e) => { log(`fatal: ${e.stack || e.message}`); process.exit(1); });
