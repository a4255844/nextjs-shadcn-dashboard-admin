-- 0004: RLS 收紧 —— 按组织隔离 + 角色控制（原第 3 阶段计划）
-- 替换 0002 的过渡期 policy（authenticated 全权读写）。
-- 结构：customers/members/organizations 全部按 members 成员关系隔离，
--       写操作要求 admin 角色。
-- 引导：0003 seed 未给用户建 members 记录，本迁移自愈式补建
--       （最早注册的用户成为演示组织的 admin）。
-- 幂等：函数 create or replace、policy 先 drop if exists、引导块带存在性守卫。

-- ============ 1. security definer 辅助函数 ============
-- 为什么需要：customers/members 的 policy 都要查 members 表验证成员关系，
-- 而 members 自己也开 RLS —— policy 内直接子查询会触发
-- "infinite recursion detected in policy"。security definer 函数
-- 以 postgres 身份执行、绕过 RLS，切断递归环。
--
-- 安全纪律：
--   set search_path = ''  防 search_path 劫持，函数体内全部用全限定名
--   stable                同一语句内结果不变，允许优化器缓存
--   language sql          简单表达式，便于审计（无过程逻辑）
--   函数体最小化          只做布尔判断，不拼接 SQL、不返回数据集
--   revoke from public    函数默认对匿名角色可执行，显式收紧

create or replace function public.is_org_member(check_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    where m.org_id = check_org_id
      and m.user_id = auth.uid()
  )
$$;

create or replace function public.is_org_admin(check_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    where m.org_id = check_org_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
  )
$$;

-- policy 表达式以查询用户身份运行，需要 EXECUTE 权限
revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

revoke all on function public.is_org_admin(uuid) from public;
grant execute on function public.is_org_admin(uuid) to authenticated;

-- ============ 2. 辅助索引 ============
-- unique (org_id, user_id) 已覆盖 is_org_member/org_admin 的查询路径；
-- user_id 单列索引服务于"列出我所在的组织"（将来组织切换器用）。
create index if not exists members_user_id_idx on public.members (user_id);

-- ============ 3. 替换 organizations 的过渡期 policy ============
-- select：组织成员可见；update/delete：仅 admin。
-- insert：无 policy = 默认拒绝。组织创建将来走 security definer
-- rpc（同时原子写入 admin 成员，解决"第一个成员"引导问题），届时再开放。
drop policy if exists "orgs_authenticated_all" on public.organizations;

drop policy if exists "orgs_select_member" on public.organizations;
create policy "orgs_select_member" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

drop policy if exists "orgs_update_admin" on public.organizations;
create policy "orgs_update_admin" on public.organizations
  for update to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

drop policy if exists "orgs_delete_admin" on public.organizations;
create policy "orgs_delete_admin" on public.organizations
  for delete to authenticated
  using (public.is_org_admin(id));

-- ============ 4. 替换 members 的过渡期 policy ============
-- select：可见自己所在组织的成员列表，以及自己的成员记录
--         （后者供将来"我的组织"查询）。
-- update：仅 admin（改角色）；delete：admin 移除成员，或本人退组织。
-- insert：无 policy = 默认拒绝。邀请流程将来与组织创建一起设计
--         （避免 with check (user_id = auth.uid()) 让任何人把自己
--         加进任意组织的安全漏洞）。
drop policy if exists "members_authenticated_all" on public.members;

drop policy if exists "members_select_own_or_org" on public.members;
create policy "members_select_own_or_org" on public.members
  for select to authenticated
  using (
    public.is_org_member(org_id)
    or user_id = auth.uid()
  );

drop policy if exists "members_update_admin" on public.members;
create policy "members_update_admin" on public.members
  for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

drop policy if exists "members_delete_admin_or_self" on public.members;
create policy "members_delete_admin_or_self" on public.members
  for delete to authenticated
  using (
    public.is_org_admin(org_id)
    or user_id = auth.uid()
  );

-- ============ 5. 替换 customers 的过渡期 policy ============
-- 读：组织成员；写：仅 admin。update 同时约束 using（能改哪些行）
-- 和 with check（改后仍在本组织内，防止把行挪到别的组织）。
drop policy if exists "customers_authenticated_all" on public.customers;

drop policy if exists "customers_select_member" on public.customers;
create policy "customers_select_member" on public.customers
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists "customers_insert_admin" on public.customers;
create policy "customers_insert_admin" on public.customers
  for insert to authenticated
  with check (public.is_org_admin(org_id));

drop policy if exists "customers_update_admin" on public.customers;
create policy "customers_update_admin" on public.customers
  for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

drop policy if exists "customers_delete_admin" on public.customers;
create policy "customers_delete_admin" on public.customers
  for delete to authenticated
  using (public.is_org_admin(org_id));

-- ============ 6. 引导：给演示组织补 admin 成员 ============
-- 0003 seed 建了组织和客户但没有 members 记录；收紧后无成员 = 无人可见。
-- 自愈规则：若最早的注册用户尚未加入任何组织，则将其设为
-- 演示组织的 admin。重复执行不产生副作用。
do $$
declare
  seed_org uuid;
  first_user uuid;
begin
  select o.id into seed_org
  from public.organizations o
  order by o.created_at, o.id
  limit 1;

  if seed_org is null then
    return; -- 无组织，无需引导
  end if;

  if exists (select 1 from public.members where org_id = seed_org) then
    return; -- 该组织已有成员，跳过
  end if;

  select u.id into first_user
  from auth.users u
  order by u.created_at, u.id
  limit 1;

  if first_user is null then
    return; -- 尚无注册用户
  end if;

  insert into public.members (org_id, user_id, role)
  values (seed_org, first_user, 'admin');
end $$;
