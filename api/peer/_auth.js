// Cookie-based password gate for the peer dashboard.
// Auth flow: POST /api/peer/auth { password } -> sets HttpOnly cookie -> read endpoints check cookie.

import crypto from 'node:crypto';

// Hardcoded gate. Simple by design.
const PEER_PASSWORD = process.env.PEER_PASSWORD || '526811';
const COOKIE_NAME = 'peer_session';
const COOKIE_TTL_HOURS = 12;

// HMAC-signed token: payload base64 + . + sig base64
// payload = { iat, exp }
function getSecret() {
  return process.env.PEER_COOKIE_SECRET ||
         process.env.SUPABASE_SECRET_KEY ||
         'fallback-not-secure-change-in-production';
}

export function issueCookie() {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + COOKIE_TTL_HOURS * 3600;
  const payload = Buffer.from(JSON.stringify({ iat: now, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyCookie(token) {
  if (!token || typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const secret = getSecret();
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (sig !== expected) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export function checkPassword(input) {
  if (typeof input !== 'string') return false;
  // Constant time compare to prevent timing attacks (mostly cosmetic for 6-digit pin)
  if (input.length !== PEER_PASSWORD.length) return false;
  return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(PEER_PASSWORD));
}

export function getCookieHeader(token) {
  // HttpOnly + Secure + SameSite=Lax (Lax allows same-origin AJAX + plays nicer with browser cookie policies)
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_TTL_HOURS * 3600}`;
}

export function getClearCookieHeader() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function readCookieFromReq(req) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === COOKIE_NAME) return v;
  }
  return null;
}

export function requireAuth(req, res) {
  const token = readCookieFromReq(req);
  if (!verifyCookie(token)) {
    res.status(401).json({ error: 'unauthenticated' });
    return false;
  }
  return true;
}
