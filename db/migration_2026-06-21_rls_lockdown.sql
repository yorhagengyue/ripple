-- 2026-06-21 — Close anon data leak.
-- APPLIED to project ubuamehrsvyrbnoxtavk via the Supabase Management API.
--
-- These 6 tables were readable (some writable) by the PUBLIC anon/publishable
-- key (which ships in the browser) because of permissive `anon USING(true)`
-- policies left over from the NAISC demo — leaking raw health, GPS, and
-- AI mental-health data to anyone. Enable RLS (idempotent) and drop every anon
-- policy → default-deny to the anon key. The backend uses the service-role key,
-- which bypasses RLS, so server-side reads/writes are unaffected.

alter table public.healthlog       enable row level security;
alter table public.baseline        enable row level security;
alter table public.alert_sessions  enable row level security;
alter table public.location_log    enable row level security;
alter table public.device_activity enable row level security;
alter table public.intervention    enable row level security;

drop policy if exists "anon read"                    on public.alert_sessions;
drop policy if exists "anon_full_access_baseline"     on public.baseline;
drop policy if exists "anon read"                    on public.device_activity;
drop policy if exists "anon update"                  on public.device_activity;
drop policy if exists "anon upsert"                  on public.device_activity;
drop policy if exists "anon_full_access_healthlog"    on public.healthlog;
drop policy if exists "anon_full_access_intervention" on public.intervention;
drop policy if exists "anon insert"                  on public.location_log;
drop policy if exists "anon select"                  on public.location_log;

-- After this, the public homepage's pulse card + the /timeline chart + the chat
-- baseline overlay read healthlog/baseline through the server-side read-proxy
-- (GET /api/mcp?path=, service-role, whitelisted to healthlog/baseline for the
-- demo user) instead of the browser anon key. Sensitive tables stay blocked.
-- Real per-user RLS policies (auth.uid() isolation) land in M2.
