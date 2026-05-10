-- Ripple · Discord presence integration
-- Run this once in Supabase SQL editor.
--
-- Three tables:
--   discord_user_link        ripple user ↔ discord user mapping
--   discord_presence_events  every distinct presence change (raw, append-only)
--   discord_sessions         derived activity sessions (computed when activity ends)

-- ─── 1. Link table ─────────────────────────────────────────────
create table if not exists discord_user_link (
  ripple_user_id   text primary key,
  discord_user_id  text not null unique,
  discord_username text,
  added_at         timestamptz not null default now(),
  active           boolean not null default true
);

-- Seed the link for current users
insert into discord_user_link (ripple_user_id, discord_user_id, discord_username)
values
  ('tommychen030607', '695066752715063418', 'gengyue.'),
  ('monika',          '695062273093271582', 'monika2052')
on conflict (ripple_user_id) do update
set discord_user_id  = excluded.discord_user_id,
    discord_username = excluded.discord_username;

-- ─── 2. Raw presence event log ─────────────────────────────────
create table if not exists discord_presence_events (
  id               bigserial primary key,
  ripple_user_id   text not null,
  discord_user_id  text not null,
  ts               timestamptz not null default now(),
  status           text,                 -- online / idle / dnd / offline
  active_devices   jsonb,                -- {desktop, mobile, web, ...}
  activities       jsonb not null default '[]'::jsonb
);
create index if not exists idx_dpe_user_ts on discord_presence_events (ripple_user_id, ts desc);
create index if not exists idx_dpe_discord_ts on discord_presence_events (discord_user_id, ts desc);

-- ─── 3. Completed activity session log ─────────────────────────
create table if not exists discord_sessions (
  id               bigserial primary key,
  ripple_user_id   text not null,
  discord_user_id  text not null,
  activity_name    text not null,
  activity_type    int  not null,        -- 0=Playing, 1=Streaming, 2=Listening, 3=Watching, 5=Competing
  started_at       timestamptz not null,
  ended_at         timestamptz not null,
  duration_ms      bigint not null,
  source           text not null,        -- 'discord_ts' | 'observed' (whether start came from discord timestamps or our own observation)
  details          text,
  state            text
);
create index if not exists idx_ds_user_started on discord_sessions (ripple_user_id, started_at desc);
create index if not exists idx_ds_user_name on discord_sessions (ripple_user_id, activity_name);

-- ─── 4. Convenience view: today's activity totals per user ─────
create or replace view v_discord_today_totals as
select
  ripple_user_id,
  activity_name,
  activity_type,
  sum(duration_ms) / 1000 as total_seconds,
  count(*) as session_count,
  min(started_at) as first_started,
  max(ended_at) as last_ended
from discord_sessions
where started_at >= date_trunc('day', now())
group by ripple_user_id, activity_name, activity_type
order by total_seconds desc;
