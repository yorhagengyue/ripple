// Shared helpers for server-side Supabase REST access.
// Service-role key is available as SUPABASE_SECRET_KEY — server only.

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const DEMO_USER = 'tommychen030607';

export async function sbInsert(table, row) {
  if (!URL || !KEY) return { ok: false, error: 'Supabase env not configured' };
  try {
    const r = await fetch(`${URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        authorization: `Bearer ${KEY}`,
        'content-type': 'application/json',
        prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    });
    if (!r.ok) return { ok: false, error: `supabase ${r.status}`, detail: (await r.text()).slice(0, 300) };
    const data = await r.json();
    return { ok: true, row: Array.isArray(data) ? data[0] : data };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 300) };
  }
}

export async function sbQuery(table, qs) {
  if (!URL || !KEY) return null;
  try {
    const r = await fetch(`${URL}/rest/v1/${table}?${qs}`, {
      headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
    });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

// Log one message to alert_sessions — single row = single message.
export async function logMessage({ user_id = DEMO_USER, state, free_text, context_tag = null, context = null, resolved_at = null }) {
  return sbInsert('alert_sessions', {
    user_id,
    state,
    free_text,
    context_tag,
    context: context || {},
    triggered_at: new Date().toISOString(),
    resolved_at,
  });
}
