// api/_lib/jwt.js — verify Supabase Auth access tokens (ES256, via the project
// JWKS). Protected endpoints derive the user from the bearer token here —
// NEVER from a query param or request body (that client-supplied identity is
// the IDOR surface M2-3 removes). Not a serverless function (under _lib).

import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS_URL =
  process.env.SUPABASE_JWKS_URL ||
  (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    ? `${process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL}/auth/v1/.well-known/jwks.json`
    : null);

let _jwks = null;
function jwks() {
  if (!_jwks) {
    if (!JWKS_URL) throw new Error('SUPABASE_JWKS_URL not configured');
    _jwks = createRemoteJWKSet(new URL(JWKS_URL)); // caches + auto-rotates keys
  }
  return _jwks;
}

// Verify a Supabase access token. Resolves { userId, email, payload } or throws.
export async function verifyJWT(token) {
  const { payload } = await jwtVerify(token, jwks(), { algorithms: ['ES256'] });
  if (!payload.sub) throw new Error('token missing sub');
  return { userId: payload.sub, email: payload.email || null, payload };
}

// Pull the bearer token out of a request (case-insensitive).
export function bearer(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(h));
  return m ? m[1].trim() : null;
}

// Endpoint guard. Returns the authenticated userId, or writes a 401 and
// returns null (callers should `if (!userId) return;`).
export async function requireAuth(req, res) {
  const token = bearer(req);
  if (!token) {
    res.status(401).json({ error: 'unauthorized: missing bearer token' });
    return null;
  }
  try {
    const { userId } = await verifyJWT(token);
    return userId;
  } catch (e) {
    res.status(401).json({ error: 'unauthorized: invalid token', detail: String(e?.message || e).slice(0, 120) });
    return null;
  }
}

// Soft auth: the authed userId if a valid bearer token is present, else the
// fallback (the public 'demo' user). Never throws — for endpoints that serve a
// public demo to logged-out callers while giving logged-in users their own data.
export async function userOr(req, fallback = 'demo') {
  const token = bearer(req);
  if (!token) return fallback;
  try { const { userId } = await verifyJWT(token); return userId; }
  catch { return fallback; }
}
