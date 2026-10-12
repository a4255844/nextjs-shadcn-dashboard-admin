-- 0005: 组织创建 / 邀请 / 切换
-- 目标：补齐多租户产品闭环——
--   1) organizations/members 的 insert 在 0004 中默认拒绝，
--      组织创建改走 security definer rpc（原子写入 org + admin 成员）；
--   2) 新增 invites 表承载一次性邀请链接（admin 生成，登录用户消费）；
--   3) 全部写路径经 rpc 做权限校验，RLS 保持最小暴露面。
-- 幂等：create or replace / drop if exists / 存在性守卫。
-- 执行：Dashboard -> SQL Editor 粘贴运行。

-- ============ 1. invites 表 ============
create extension if not exists pgcrypto;

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- 256-bit 随机 hex：防枚举、防猜测
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  role text not null default 'member' check (role in ('admin', 'member')),
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invites_org_idx on public.invites (org_id);

-- RLS 开启但零 policy：客户端直接读写一律拒绝（连 admin 也不行），
-- 邀请的创建/消费全部经 security definer rpc 完成权限校验。
alter table public.invites enable row level security;

-- ============ 2. security definer rpc：创建组织 ============
-- 解决"第一个成员"引导问题：insert organizations 与 members(role='admin')
-- 在同一函数内原子完成。organizatins/members 的 insert policy 保持默认拒绝。
create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_name text;
  v_org uuid;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'auth_required';
  end if;

  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 60 then
    raise exception 'invalid_name';
  end if;

  insert into public.organizations (name)
  values (v_name)
  returning id into v_org;

  insert into public.members (org_id, user_id, role)
  values (v_org, v_user, 'admin');

  return v_org;
end;
$$;

-- ============ 3. security definer rpc：生成邀请 ============
-- 仅 admin 可为所在组织生成邀请；生成前先把该组织未使用的活跃邀请
-- 全部置为过期（单活跃链接语义："重新生成"即失效旧链接）。
create or replace function public.create_invite(p_org_id uuid, p_role text default 'member')
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_role text;
  v_token text;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'auth_required';
  end if;

  if not public.is_org_admin(p_org_id) then
    raise exception 'not_admin';
  end if;

  v_role := coalesce(p_role, 'member');
  if v_role not in ('admin', 'member') then
    raise exception 'invalid_role';
  end if;

  update public.invites
  set expires_at = now()
  where org_id = p_org_id
    and used_at is null
    and expires_at > now();

  insert into public.invites (org_id, role, created_by)
  values (p_org_id, v_role, v_user)
  returning token into v_token;

  return v_token;
end;
$$;

-- ============ 4. security definer rpc：消费邀请 ============
-- 行锁防并发双花；已是成员则不消耗 token（幂等重入）。
-- 异常码：invalid（无此 token）/ used / expired。
create or replace function public.join_organization(p_token text)
returns table (org_id uuid, already_member boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_org uuid;
  v_role text;
  v_expires timestamptz;
  v_used_at timestamptz;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'auth_required';
  end if;

  select i.org_id, i.role, i.expires_at, i.used_at
  into v_org, v_role, v_expires, v_used_at
  from public.invites i
  where i.token = btrim(coalesce(p_token, ''))
  for update;

  if v_org is null then
    raise exception 'invalid';
  end if;

  if v_used_at is not null then
    raise exception 'used';
  end if;

  if v_expires <= now() then
    raise exception 'expired';
  end if;

  if public.is_org_member(v_org) then
    return query select v_org, true;
    return;
  end if;

  insert into public.members (org_id, user_id, role)
  values (v_org, v_user, v_role);

  update public.invites
  set used_at = now(),
      used_by = v_user
  where token = btrim(coalesce(p_token, ''));

  return query select v_org, false;
end;
$$;

-- ============ 5. rpc 执行权限 ============
-- policy 表达式与客户端 rpc 调用均以查询用户身份运行，需显式授权。
revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

revoke all on function public.create_invite(uuid, text) from public, anon;
grant execute on function public.create_invite(uuid, text) to authenticated;

revoke all on function public.join_organization(text) from public, anon;
grant execute on function public.join_organization(text) to authenticated;
