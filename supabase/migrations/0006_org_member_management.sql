-- 0006: 成员管理（组织管理页后端）
-- 目标：补齐多租户管理侧能力——
--   1) list_org_members：成员名单（join profiles 取姓名/邮箱/头像）。
--      必须走 security definer：profiles 的 RLS 只允许读自己，
--      成员要看其他成员的资料，普通身份查询会被 RLS 拦掉；
--   2) update_member_role：admin 改角色（含"最后一个 admin"保护）；
--   3) remove_member：admin 移除成员 + 成员自行退出（同一函数，
--      非 admin 仅能移除自己），同样受最后 admin 保护；
--   4) get_active_invite：admin 读当前活跃邀请（单活跃链接语义，最多一行）。
-- 并发：两个写函数先对组织全部 member 行加 for update 行锁，
--       串行化 last_admin 判定，防止两个 admin 并发互降产生零 admin 组织。
-- 幂等：create or replace；执行：Dashboard -> SQL Editor 粘贴运行。

-- ============ 1. rpc：成员名单 ============
-- 门控：登录 + 组织成员（非 admin 也能看成员名单，管理页只读态用）。
-- left join profiles：profile 行缺失时姓名/邮箱为 null，UI 层兜底。
create or replace function public.list_org_members(p_org_id uuid)
returns table (
  user_id uuid,
  role text,
  joined_at timestamptz,
  email text,
  first_name text,
  last_name text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if not public.is_org_member(p_org_id) then
    raise exception 'not_member';
  end if;

  return query
  select
    m.user_id,
    m.role,
    m.created_at,
    p.email,
    p.first_name,
    p.last_name,
    p.avatar_url
  from public.members m
  left join public.profiles p on p.id = m.user_id
  where m.org_id = p_org_id
  order by m.created_at, m.user_id;
end;
$$;

-- ============ 2. rpc：变更成员角色（仅 admin） ============
-- 决策：不禁止改自己——存在另一个 admin 时自降级是合法的"移交管理员"。
-- 不变量只有一条：组织至少保留一个 admin（UI 层对自己行隐藏入口，防误操作）。
create or replace function public.update_member_role(
  p_org_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if not public.is_org_admin(p_org_id) then
    raise exception 'not_admin';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception 'invalid_role';
  end if;

  -- 组织级行锁：串行化同组织所有 last_admin 判定
  perform 1
  from public.members m
  where m.org_id = p_org_id
  order by m.user_id
  for update;

  if not exists (
    select 1 from public.members
    where org_id = p_org_id and user_id = p_user_id
  ) then
    raise exception 'not_member';
  end if;

  -- 最后一个 admin 保护：目标是 admin、要降为 member、且无其他 admin
  if p_role = 'member'
    and exists (
      select 1 from public.members
      where org_id = p_org_id and user_id = p_user_id and role = 'admin'
    )
    and not exists (
      select 1 from public.members
      where org_id = p_org_id and role = 'admin' and user_id <> p_user_id
    )
  then
    raise exception 'last_admin';
  end if;

  update public.members
  set role = p_role
  where org_id = p_org_id and user_id = p_user_id;
end;
$$;

-- ============ 3. rpc：移除成员 / 自行退出 ============
-- 权限：admin 可移除任意成员；非 admin 仅能移除自己（self-leave）。
-- 最后 admin 保护对"移除 admin"生效（含 admin 自退、admin 移除另一 admin
-- 后仅剩一人），保证组织永远不会失去全部管理员。
create or replace function public.remove_member(
  p_org_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if not public.is_org_admin(p_org_id) and p_user_id <> auth.uid() then
    raise exception 'not_admin';
  end if;

  perform 1
  from public.members m
  where m.org_id = p_org_id
  order by m.user_id
  for update;

  if not exists (
    select 1 from public.members
    where org_id = p_org_id and user_id = p_user_id
  ) then
    raise exception 'not_member';
  end if;

  -- 最后一个 admin 保护：目标（可能是自己）是 admin 且无其他 admin
  if exists (
    select 1 from public.members
    where org_id = p_org_id and user_id = p_user_id and role = 'admin'
  )
    and not exists (
      select 1 from public.members
      where org_id = p_org_id and role = 'admin' and user_id <> p_user_id
    )
  then
    raise exception 'last_admin';
  end if;

  delete from public.members
  where org_id = p_org_id and user_id = p_user_id;
end;
$$;

-- ============ 4. rpc：读当前活跃邀请（仅 admin） ============
-- 单活跃链接语义（0005 create_invite 生成前会把旧活跃链接全部置过期），
-- 最多一行；无活跃邀请返回空集，由调用方映射为 null。
create or replace function public.get_active_invite(p_org_id uuid)
returns table (
  token text,
  role text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if not public.is_org_admin(p_org_id) then
    raise exception 'not_admin';
  end if;

  return query
  select
    i.token,
    i.role,
    i.expires_at,
    i.created_at
  from public.invites i
  where i.org_id = p_org_id
    and i.used_at is null
    and i.expires_at > now()
  order by i.created_at desc
  limit 1;
end;
$$;

-- ============ 5. rpc 执行权限 ============
-- policy 表达式与客户端 rpc 调用均以查询用户身份运行，需显式授权。
revoke all on function public.list_org_members(uuid) from public, anon;
grant execute on function public.list_org_members(uuid) to authenticated;

revoke all on function public.update_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.update_member_role(uuid, uuid, text) to authenticated;

revoke all on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

revoke all on function public.get_active_invite(uuid) from public, anon;
grant execute on function public.get_active_invite(uuid) to authenticated;
