-- 2026-06-21 — M2-7 cost guard. APPLIED to ubuamehrsvyrbnoxtavk via the Supabase
-- Management API. Protects the shared Kimi key during the free beta: per-key
-- hourly request cap + daily token cap. Key = "ip:<addr>" now, "user:<uuid>"
-- after M2-3. Tables are service-role only (RLS on, no policies → anon denied;
-- service-role bypasses). Used by api/_lib/cost-guard.js in the 4 LLM endpoints.

create table if not exists public.rate_limit (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);
create table if not exists public.token_spend (
  key text not null,
  day date not null,
  tokens bigint not null default 0,
  primary key (key, day)
);
alter table public.rate_limit  enable row level security;
alter table public.token_spend enable row level security;

-- atomic hourly request bump → returns the new count for the current hour
create or replace function public.rl_bump(p_key text) returns int language plpgsql as $$
declare w timestamptz := date_trunc('hour', now()); c int;
begin
  insert into public.rate_limit(key, window_start, count) values (p_key, w, 1)
  on conflict (key, window_start) do update set count = rate_limit.count + 1
  returning count into c;
  return c;
end $$;

-- add tokens to today's spend → returns the new daily total
create or replace function public.spend_bump(p_key text, p_tokens int) returns bigint language plpgsql as $$
declare d date := current_date; t bigint;
begin
  insert into public.token_spend(key, day, tokens) values (p_key, d, greatest(p_tokens, 0))
  on conflict (key, day) do update set tokens = token_spend.tokens + greatest(p_tokens, 0)
  returning tokens into t;
  return t;
end $$;

revoke execute on function public.rl_bump(text)         from anon, authenticated;
revoke execute on function public.spend_bump(text, int) from anon, authenticated;

-- Defaults (env-overridable in cost-guard.js): COST_REQ_PER_HOUR=30, COST_TOKENS_PER_DAY=100000.
