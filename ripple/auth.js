// ripple/auth.js — browser Supabase Auth client (email OTP). Bundled by Vite,
// so import.meta.env.VITE_* is inlined at build. The anon/publishable key is
// public by design; data is protected by RLS, identity by the verified JWT.

import { createClient } from '@supabase/supabase-js';

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _sb = null;
export function supa() {
  if (!_sb) _sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: true, autoRefreshToken: true } });
  return _sb;
}

export async function getSession() {
  const { data } = await supa().auth.getSession();
  return data.session || null;
}
export async function getUser() {
  const s = await getSession();
  return s?.user || null;
}
export async function getAccessToken() {
  const s = await getSession();
  return s?.access_token || null;
}

// Email OTP — step 1: send the 6-digit code (creates the user if new).
export function sendOtp(email) {
  return supa().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
}
// step 2: verify the code → establishes a session. Tries the OTP-login type
// first ('email'), then the new-signup type ('signup') so both flows work.
export async function verifyOtp(email, token) {
  let r = await supa().auth.verifyOtp({ email, token, type: 'email' });
  if (r.error) {
    const r2 = await supa().auth.verifyOtp({ email, token, type: 'signup' });
    if (!r2.error) return r2;
  }
  return r;
}
export function signOut() {
  return supa().auth.signOut();
}
export function onAuth(cb) {
  return supa().auth.onAuthStateChange((_event, session) => cb(session));
}

// For attaching to /api/* fetches once endpoints require auth (M2-3).
export async function authHeader() {
  const t = await getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
