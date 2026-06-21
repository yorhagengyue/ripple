// api/_lib/cost-guard.js — protect the shared Kimi key during the free beta.
// Per-key hourly request cap + daily token cap, backed by Supabase RPCs
// (rl_bump / spend_bump, service-role only). FAILS OPEN on any infra error —
// never block real usage because the limiter itself broke. Cron callers are
// exempt at the endpoint (they carry x-nudge-secret / x-cron-secret).
//
// Key = "user:<uuid>" once auth is wired (M2-3); for now "ip:<addr>".

const SUPA = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SECRET_KEY;

const REQ_PER_HOUR   = Number(process.env.COST_REQ_PER_HOUR   || 30);     // per key+endpoint, per hour
const TOKENS_PER_DAY = Number(process.env.COST_TOKENS_PER_DAY || 100000); // per key, per day

// Best-effort caller identity. Prefer an already-resolved user id, else IP.
export function costKey(req, userId) {
  if (userId) return `user:${userId}`;
  const fwd = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return `ip:${fwd || req.headers?.['x-real-ip'] || 'unknown'}`;
}

async function rpc(fn, args) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`rpc ${fn} ${r.status}`);
  return r.json();
}

// Call BEFORE the LLM request. Returns { ok:true } or { ok:false, reason }.
export async function checkCostGuard(key, endpoint) {
  if (!SUPA || !KEY) return { ok: true }; // unconfigured → don't block
  try {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await (await fetch(
      `${SUPA}/rest/v1/token_spend?key=eq.${encodeURIComponent(key)}&day=eq.${today}&select=tokens`,
      { headers: { apikey: KEY, authorization: `Bearer ${KEY}` } },
    )).json();
    const spent = Array.isArray(rows) && rows[0] ? Number(rows[0].tokens) : 0;
    if (spent >= TOKENS_PER_DAY) return { ok: false, reason: 'daily token cap reached' };

    const count = await rpc('rl_bump', { p_key: `${key}:${endpoint}` });
    if (count > REQ_PER_HOUR) return { ok: false, reason: 'hourly request limit reached' };
    return { ok: true, count, spent };
  } catch {
    return { ok: true }; // fail open on limiter errors
  }
}

// Call AFTER the LLM request with the tokens consumed (from the API's usage).
export async function recordTokens(key, tokens) {
  if (!SUPA || !KEY || !tokens) return;
  try { await rpc('spend_bump', { p_key: key, p_tokens: Math.max(0, Math.round(tokens)) }); } catch { /* ignore */ }
}
