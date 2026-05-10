-- profile_messages — Hermes 多 profile 对话同步表
-- 用于 dashboard 实时查看 dad / xirui / 等等 profile 的微信对话
-- 创建后执行：
--   1. 在 Supabase Dashboard 的 SQL Editor 里粘贴运行
--   2. 或者用 psql/supabase-cli 推
--
-- 表结构允许多 profile 共用一张表，查询用 profile 字段过滤。

create table if not exists profile_messages (
  id bigserial primary key,
  profile text not null,                 -- 'dad' / 'xirui' / 等
  source_id bigint not null,             -- Hermes message.id（用于 dedup）
  session_id text,
  ts timestamptz not null,
  role text not null,                    -- user / assistant / tool / session_meta
  content text,
  tool_name text,
  inserted_at timestamptz not null default now(),
  unique(profile, source_id)
);

create index if not exists profile_messages_profile_ts_idx
  on profile_messages(profile, ts desc);

create index if not exists profile_messages_profile_source_idx
  on profile_messages(profile, source_id);

-- RLS — 默认禁用全部公开访问，所有读写走 service role key
alter table profile_messages enable row level security;

-- 不创建任何 policy，意味着 anon key 不能读
-- service role key 永远可以（绕过 RLS）

-- 可选：profile 元数据表，给 dashboard 显示头像/名称
create table if not exists profile_meta (
  profile text primary key,
  display_name text not null,
  avatar text,                           -- emoji 或 URL
  description text,
  created_at timestamptz default now()
);

alter table profile_meta enable row level security;

-- 初始数据
insert into profile_meta (profile, display_name, avatar, description)
values
  ('dad', '父亲', '👨', '慢性乙肝携带者，机加工公司老板'),
  ('xirui', '希睿', '🌊', '双相情感障碍，14 岁起病')
on conflict (profile) do nothing;
