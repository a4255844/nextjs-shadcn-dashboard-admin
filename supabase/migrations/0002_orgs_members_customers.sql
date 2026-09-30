-- 0002: organizations / members / customers 三表
-- 目标：多租户结构就位（第 3 阶段 RLS 收紧的基础），
--       customers 数据替换前端 mock。

-- 客户状态枚举：与前端 types.ts 的 StatusKey 对齐
create type public.customer_status as enum ('active', 'inactive', 'vip', 'atRisk');

-- 组织（多租户的顶层实体）
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- 成员关系：用户 <-> 组织 多对多，带角色
create table public.members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- 客户表：挂在组织下
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text not null,
  company text not null,
  status public.customer_status not null default 'active',
  spent integer not null default 0, -- 金额为整数（元）；将来需要小数可改 numeric
  created_at date not null default current_date,
  avatar_color text, -- 头像底色 tailwind 类名（首字母 fallback 用）
  unique (org_id, email)
);

-- 所有业务表从第一天就开 RLS（生产纪律）
alter table public.organizations enable row level security;
alter table public.members enable row level security;
alter table public.customers enable row level security;

-- 过渡期 policy：登录用户全权读写。
-- 注意：这是第 2 阶段的临时放宽，第 3 阶段会收紧为"按组织隔离 + 角色控制"。
create policy "orgs_authenticated_all"
  on public.organizations for all to authenticated using (true) with check (true);

create policy "members_authenticated_all"
  on public.members for all to authenticated using (true) with check (true);

create policy "customers_authenticated_all"
  on public.customers for all to authenticated using (true) with check (true);
