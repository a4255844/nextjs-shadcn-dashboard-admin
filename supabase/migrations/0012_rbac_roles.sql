-- 0012: RBAC —— 组织自定义角色 + 权限树
-- 目标：
--   1) permissions：权限目录（与 src/lib/permissions.ts 的目录一一对应）
--   2) roles / role_permissions：每组织一个内置 admin 系统角色 + admin 自建的任意角色
--   3) members.role(text) -> members.role_id(uuid)；invites 同步改造
--   4) has_org_permission() 统一判定，customers/orders/organizations/members 的
--      RLS 从 is_org_admin 全量改为"按功能权限"
--   5) 角色 CRUD 与成员角色变更 RPC（security definer，函数内自行校验权限）
-- 兼容：is_org_admin 保留，语义改为"持有系统角色"，供既有 storage policy 使用。
-- 幂等：create table if not exists / add column if not exists / drop if exists /
--       create or replace。执行：Dashboard -> SQL Editor 粘贴运行。

-- ============ 1. 权限目录 ============
create table if not exists public.permissions (
  key    text primary key,
  module text not null,
  sort   integer not null default 0
);

alter table public.permissions enable row level security;

-- 目录是静态元数据，登录用户可读（角色树 UI 需要按目录渲染）
drop policy if exists "permissions_select_authenticated" on public.permissions;
create policy "permissions_select_authenticated" on public.permissions
  for select to authenticated
  using (true);

insert into public.permissions (key, module, sort) values
  ('dashboard.browse', 'dashboard', 10),
  ('customers.browse', 'customers', 20),
  ('customers.create', 'customers', 21),
  ('customers.update', 'customers', 22),
  ('customers.delete', 'customers', 23),
  ('customers.export', 'customers', 24),
  ('customers.import', 'customers', 25),
  ('orders.browse',     'orders',    30),
  ('orders.create',    'orders',    31),
  ('orders.update',    'orders',    32),
  ('orders.delete',    'orders',    33),
  ('orders.export',    'orders',    34),
  ('orders.import',    'orders',    35),
  ('members.browse',    'members',   40),
  ('members.invite',   'members',   41),
  ('members.manage',   'members',   42),
  ('org.update',       'org',       50),
  ('org.delete',       'org',       51)
on conflict (key) do update
  set module = excluded.module,
      sort   = excluded.sort;

-- ============ 2. 角色表 ============
create table if not exists public.roles (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  -- 系统角色（admin）不可删、不可改权限，由迁移创建
  is_system  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create index if not exists roles_org_id_idx on public.roles (org_id);

-- 每个组织最多一个系统角色
create unique index if not exists roles_one_system_per_org
  on public.roles (org_id) where is_system;

create table if not exists public.role_permissions (
  role_id        uuid not null references public.roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role_id, permission_key)
);

alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;

-- ============ 3. 补齐各组织的系统角色 + 全量权限 ============
insert into public.roles (org_id, name, is_system)
select o.id, 'Admin', true
from public.organizations o
where not exists (
  select 1 from public.roles r where r.org_id = o.id and r.is_system
);

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join public.permissions p
where r.is_system
on conflict do nothing;

-- ============ 4. members.role -> members.role_id ============
alter table public.members
  add column if not exists role_id uuid references public.roles (id) on delete restrict;

-- 旧 admin 成员 -> 系统角色
update public.members m
set role_id = r.id
from public.roles r
where m.role_id is null
  and m.role = 'admin'
  and r.org_id = m.org_id
  and r.is_system;

-- 旧 member 成员 -> 每组织一个 Member 自定义角色（保持原有只读语义）
insert into public.roles (org_id, name, is_system)
select distinct m.org_id, 'Member', false
from public.members m
where m.role_id is null
  and m.role = 'member'
  and not exists (
    select 1 from public.roles r where r.org_id = m.org_id and r.name = 'Member'
  );

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
join public.permissions p on p.key in (
  'dashboard.browse', 'customers.browse', 'customers.export',
  'orders.browse', 'orders.export', 'members.browse'
)
where r.is_system = false
  and r.name = 'Member'
on conflict do nothing;

update public.members m
set role_id = r.id
from public.roles r
where m.role_id is null
  and m.role = 'member'
  and r.org_id = m.org_id
  and r.name = 'Member';

-- 兜底自愈：仍未分配角色的成员归入系统角色，避免出现"不可见组织"
update public.members m
set role_id = r.id
from public.roles r
where m.role_id is null
  and r.org_id = m.org_id
  and r.is_system;

alter table public.members alter column role_id set not null;
create index if not exists members_role_id_idx on public.members (role_id);

-- ============ 5. 权限判定函数（先建函数，再删旧列） ============
create or replace function public.has_org_permission(
  check_org_id uuid,
  check_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    join public.role_permissions rp on rp.role_id = m.role_id
    where m.org_id = check_org_id
      and m.user_id = auth.uid()
      and rp.permission_key = check_permission
  )
$$;

-- 兼容旧调用：admin 的系统角色即"超级管理员"
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
    join public.roles r on r.id = m.role_id
    where m.org_id = check_org_id
      and m.user_id = auth.uid()
      and r.is_system
  )
$$;

revoke all on function public.has_org_permission(uuid, text) from public, anon;
grant execute on function public.has_org_permission(uuid, text) to authenticated;

revoke all on function public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_org_admin(uuid) to authenticated;

-- 旧列不再作为权限来源（check 约束随列一并删除）
alter table public.members drop column if exists role;

-- ============ 6. invites.role -> invites.role_id ============
alter table public.invites
  add column if not exists role_id uuid references public.roles (id) on delete restrict;

update public.invites i
set role_id = r.id
from public.roles r
where i.role_id is null
  and r.org_id = i.org_id
  and (
    (i.role = 'admin' and r.is_system)
    or (i.role = 'member' and r.name = 'Member')
  );

update public.invites i
set role_id = r.id
from public.roles r
where i.role_id is null
  and r.org_id = i.org_id
  and r.is_system;

alter table public.invites alter column role_id set not null;
alter table public.invites drop column if exists role;
create index if not exists invites_role_id_idx on public.invites (role_id);

-- ============ 7. RLS：全部改为按权限 ============
-- organizations
drop policy if exists "orgs_select_member" on public.organizations;
create policy "orgs_select_member" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

drop policy if exists "orgs_update_admin" on public.organizations;
drop policy if exists "orgs_update_permission" on public.organizations;
create policy "orgs_update_permission" on public.organizations
  for update to authenticated
  using (public.has_org_permission(id, 'org.update'))
  with check (public.has_org_permission(id, 'org.update'));

drop policy if exists "orgs_delete_admin" on public.organizations;
drop policy if exists "orgs_delete_permission" on public.organizations;
create policy "orgs_delete_permission" on public.organizations
  for delete to authenticated
  using (public.has_org_permission(id, 'org.delete'));

-- members
drop policy if exists "members_select_own_or_org" on public.members;
create policy "members_select_own_or_org" on public.members
  for select to authenticated
  using (
    public.is_org_member(org_id)
    or user_id = auth.uid()
  );

drop policy if exists "members_update_admin" on public.members;
drop policy if exists "members_update_permission" on public.members;
create policy "members_update_permission" on public.members
  for update to authenticated
  using (public.has_org_permission(org_id, 'members.manage'))
  with check (public.has_org_permission(org_id, 'members.manage'));

drop policy if exists "members_delete_admin_or_self" on public.members;
drop policy if exists "members_delete_permission_or_self" on public.members;
create policy "members_delete_permission_or_self" on public.members
  for delete to authenticated
  using (
    public.has_org_permission(org_id, 'members.manage')
    or user_id = auth.uid()
  );

-- customers
drop policy if exists "customers_select_member" on public.customers;
create policy "customers_select_permission" on public.customers
  for select to authenticated
  using (public.has_org_permission(org_id, 'customers.browse'));

drop policy if exists "customers_insert_admin" on public.customers;
create policy "customers_insert_permission" on public.customers
  for insert to authenticated
  with check (public.has_org_permission(org_id, 'customers.create'));

drop policy if exists "customers_update_admin" on public.customers;
create policy "customers_update_permission" on public.customers
  for update to authenticated
  using (public.has_org_permission(org_id, 'customers.update'))
  with check (public.has_org_permission(org_id, 'customers.update'));

drop policy if exists "customers_delete_admin" on public.customers;
create policy "customers_delete_permission" on public.customers
  for delete to authenticated
  using (public.has_org_permission(org_id, 'customers.delete'));

-- orders
drop policy if exists "orders_select_member" on public.orders;
create policy "orders_select_permission" on public.orders
  for select to authenticated
  using (public.has_org_permission(org_id, 'orders.browse'));

drop policy if exists "orders_insert_admin" on public.orders;
create policy "orders_insert_permission" on public.orders
  for insert to authenticated
  with check (public.has_org_permission(org_id, 'orders.create'));

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_permission" on public.orders
  for update to authenticated
  using (public.has_org_permission(org_id, 'orders.update'))
  with check (public.has_org_permission(org_id, 'orders.update'));

drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_delete_permission" on public.orders
  for delete to authenticated
  using (public.has_org_permission(org_id, 'orders.delete'));

-- roles：成员可读；写需 members.manage 且禁止触碰系统角色
drop policy if exists "roles_select_member" on public.roles;
create policy "roles_select_member" on public.roles
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists "roles_insert_manage" on public.roles;
create policy "roles_insert_manage" on public.roles
  for insert to authenticated
  with check (
    public.has_org_permission(org_id, 'members.manage')
    and is_system = false
  );

drop policy if exists "roles_update_manage" on public.roles;
create policy "roles_update_manage" on public.roles
  for update to authenticated
  using (
    public.has_org_permission(org_id, 'members.manage')
    and is_system = false
  )
  with check (
    public.has_org_permission(org_id, 'members.manage')
    and is_system = false
  );

drop policy if exists "roles_delete_manage" on public.roles;
create policy "roles_delete_manage" on public.roles
  for delete to authenticated
  using (
    public.has_org_permission(org_id, 'members.manage')
    and is_system = false
  );

-- role_permissions：成员可读；写需 members.manage 且目标角色非系统角色
drop policy if exists "role_permissions_select_member" on public.role_permissions;
create policy "role_permissions_select_member" on public.role_permissions
  for select to authenticated
  using (
    exists (
      select 1 from public.roles r
      where r.id = role_id and public.is_org_member(r.org_id)
    )
  );

drop policy if exists "role_permissions_insert_manage" on public.role_permissions;
create policy "role_permissions_insert_manage" on public.role_permissions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.roles r
      where r.id = role_id
        and not r.is_system
        and public.has_org_permission(r.org_id, 'members.manage')
    )
  );

drop policy if exists "role_permissions_delete_manage" on public.role_permissions;
create policy "role_permissions_delete_manage" on public.role_permissions
  for delete to authenticated
  using (
    exists (
      select 1 from public.roles r
      where r.id = role_id
        and not r.is_system
        and public.has_org_permission(r.org_id, 'members.manage')
    )
  );

-- ============ 8. 成员名单 / 角色变更 / 移除：改为 role_id ============
drop function if exists public.list_org_members(uuid);

create or replace function public.list_org_members(p_org_id uuid)
returns table (
  user_id uuid,
  role_id uuid,
  role_name text,
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
    m.role_id,
    r.name,
    m.created_at,
    p.email,
    p.first_name,
    p.last_name,
    p.avatar_url
  from public.members m
  join public.roles r on r.id = m.role_id
  left join public.profiles p on p.id = m.user_id
  where m.org_id = p_org_id
  order by m.created_at, m.user_id;
end;
$$;

drop function if exists public.update_member_role(uuid, uuid, text);

create or replace function public.update_member_role(
  p_org_id uuid,
  p_user_id uuid,
  p_role_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_is_system boolean;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if not public.has_org_permission(p_org_id, 'members.manage') then
    raise exception 'not_allowed';
  end if;

  select r.is_system into v_is_system
  from public.roles r
  where r.id = p_role_id and r.org_id = p_org_id;

  if v_is_system is null then
    raise exception 'invalid_role';
  end if;

  -- 组织级行锁：串行化 last_admin 判定
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

  -- 不变量：组织至少保留一个持有系统角色的成员
  if not v_is_system
    and exists (
      select 1
      from public.members m
      join public.roles r on r.id = m.role_id
      where m.org_id = p_org_id and m.user_id = p_user_id and r.is_system
    )
    and not exists (
      select 1
      from public.members m
      join public.roles r on r.id = m.role_id
      where m.org_id = p_org_id and r.is_system and m.user_id <> p_user_id
    )
  then
    raise exception 'last_admin';
  end if;

  update public.members
  set role_id = p_role_id
  where org_id = p_org_id and user_id = p_user_id;
end;
$$;

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

  if not public.has_org_permission(p_org_id, 'members.manage')
    and p_user_id <> auth.uid() then
    raise exception 'not_allowed';
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

  if exists (
    select 1
    from public.members m
    join public.roles r on r.id = m.role_id
    where m.org_id = p_org_id and m.user_id = p_user_id and r.is_system
  )
    and not exists (
      select 1
      from public.members m
      join public.roles r on r.id = m.role_id
      where m.org_id = p_org_id and r.is_system and m.user_id <> p_user_id
    )
  then
    raise exception 'last_admin';
  end if;

  delete from public.members
  where org_id = p_org_id and user_id = p_user_id;
end;
$$;

-- ============ 9. 邀请：按角色分配 ============
drop function if exists public.create_invite(uuid, text);

create or replace function public.create_invite(
  p_org_id uuid,
  p_role_id uuid
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_token text;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'auth_required';
  end if;

  if not public.has_org_permission(p_org_id, 'members.invite') then
    raise exception 'not_allowed';
  end if;

  if not exists (
    select 1 from public.roles r
    where r.id = p_role_id and r.org_id = p_org_id
  ) then
    raise exception 'invalid_role';
  end if;

  update public.invites
  set expires_at = now()
  where org_id = p_org_id
    and used_at is null
    and expires_at > now();

  insert into public.invites (org_id, role_id, created_by)
  values (p_org_id, p_role_id, v_user)
  returning token into v_token;

  return v_token;
end;
$$;

drop function if exists public.get_active_invite(uuid);

create or replace function public.get_active_invite(p_org_id uuid)
returns table (
  token text,
  role_id uuid,
  role_name text,
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

  if not public.has_org_permission(p_org_id, 'members.invite') then
    raise exception 'not_allowed';
  end if;

  return query
  select i.token, i.role_id, r.name, i.expires_at, i.created_at
  from public.invites i
  join public.roles r on r.id = i.role_id
  where i.org_id = p_org_id
    and i.used_at is null
    and i.expires_at > now()
  order by i.created_at desc
  limit 1;
end;
$$;

drop function if exists public.join_organization(text);

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
  v_role_id uuid;
  v_expires timestamptz;
  v_used_at timestamptz;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'auth_required';
  end if;

  select i.org_id, i.role_id, i.expires_at, i.used_at
  into v_org, v_role_id, v_expires, v_used_at
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

  insert into public.members (org_id, user_id, role_id)
  values (v_org, v_user, v_role_id);

  update public.invites
  set used_at = now(),
      used_by = v_user
  where token = btrim(coalesce(p_token, ''));

  return query select v_org, false;
end;
$$;

-- ============ 10. 创建组织：原子写入 org + 系统角色 + admin 成员 ============
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
  v_org  uuid;
  v_role uuid;
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

  insert into public.roles (org_id, name, is_system)
  values (v_org, 'Admin', true)
  returning id into v_role;

  insert into public.role_permissions (role_id, permission_key)
  select v_role, p.key from public.permissions p;

  insert into public.members (org_id, user_id, role_id)
  values (v_org, v_user, v_role);

  return v_org;
end;
$$;

-- ============ 11. 当前用户在某组织的权限集合 ============
create or replace function public.my_org_permissions(p_org_id uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select rp.permission_key
  from public.members m
  join public.role_permissions rp on rp.role_id = m.role_id
  where m.org_id = p_org_id
    and m.user_id = auth.uid()
  order by rp.permission_key
$$;

-- ============ 12. 角色 CRUD ============
create or replace function public.list_org_roles(p_org_id uuid)
returns table (
  id uuid,
  name text,
  is_system boolean,
  permissions text[]
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
    r.id,
    r.name,
    r.is_system,
    coalesce(
      array_agg(rp.permission_key order by rp.permission_key)
        filter (where rp.permission_key is not null),
      '{}'
    )
  from public.roles r
  left join public.role_permissions rp on rp.role_id = r.id
  where r.org_id = p_org_id
  group by r.id, r.name, r.is_system
  order by r.is_system desc, r.name;
end;
$$;

create or replace function public.create_role(
  p_org_id uuid,
  p_name text,
  p_permissions text[]
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_role uuid;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if not public.has_org_permission(p_org_id, 'members.manage') then
    raise exception 'not_allowed';
  end if;

  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    raise exception 'invalid_name';
  end if;

  begin
    insert into public.roles (org_id, name, is_system)
    values (p_org_id, v_name, false)
    returning id into v_role;
  exception
    when unique_violation then
      raise exception 'role_name_taken';
  end;

  begin
    insert into public.role_permissions (role_id, permission_key)
    select v_role, unnest(p_permissions)
    on conflict do nothing;
  exception
    when foreign_key_violation then
      raise exception 'invalid_permission';
  end;

  return v_role;
end;
$$;

create or replace function public.update_role(
  p_role_id uuid,
  p_name text,
  p_permissions text[]
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_system boolean;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  select r.org_id, r.is_system into v_org, v_system
  from public.roles r
  where r.id = p_role_id;

  if v_org is null then
    raise exception 'invalid_role';
  end if;

  if v_system then
    raise exception 'system_role';
  end if;

  if not public.has_org_permission(v_org, 'members.manage') then
    raise exception 'not_allowed';
  end if;

  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    raise exception 'invalid_name';
  end if;

  begin
    update public.roles set name = v_name where id = p_role_id;
  exception
    when unique_violation then
      raise exception 'role_name_taken';
  end;

  delete from public.role_permissions where role_id = p_role_id;

  begin
    insert into public.role_permissions (role_id, permission_key)
    select p_role_id, unnest(p_permissions)
    on conflict do nothing;
  exception
    when foreign_key_violation then
      raise exception 'invalid_permission';
  end;
end;
$$;

create or replace function public.delete_role(p_role_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_system boolean;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  select r.org_id, r.is_system into v_org, v_system
  from public.roles r
  where r.id = p_role_id;

  if v_org is null then
    raise exception 'invalid_role';
  end if;

  if v_system then
    raise exception 'system_role';
  end if;

  if not public.has_org_permission(v_org, 'members.manage') then
    raise exception 'not_allowed';
  end if;

  if exists (
    select 1 from public.members m where m.role_id = p_role_id
  ) or exists (
    select 1 from public.invites i
    where i.role_id = p_role_id and i.used_at is null and i.expires_at > now()
  ) then
    raise exception 'role_in_use';
  end if;

  delete from public.roles where id = p_role_id;
end;
$$;

-- ============ 13. RPC 执行权限 ============
revoke all on function public.list_org_members(uuid) from public, anon;
grant execute on function public.list_org_members(uuid) to authenticated;

revoke all on function public.update_member_role(uuid, uuid, uuid) from public, anon;
grant execute on function public.update_member_role(uuid, uuid, uuid) to authenticated;

revoke all on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

revoke all on function public.create_invite(uuid, uuid) from public, anon;
grant execute on function public.create_invite(uuid, uuid) to authenticated;

revoke all on function public.get_active_invite(uuid) from public, anon;
grant execute on function public.get_active_invite(uuid) to authenticated;

revoke all on function public.join_organization(text) from public, anon;
grant execute on function public.join_organization(text) to authenticated;

revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

revoke all on function public.my_org_permissions(uuid) from public, anon;
grant execute on function public.my_org_permissions(uuid) to authenticated;

revoke all on function public.list_org_roles(uuid) from public, anon;
grant execute on function public.list_org_roles(uuid) to authenticated;

revoke all on function public.create_role(uuid, text, text[]) from public, anon;
grant execute on function public.create_role(uuid, text, text[]) to authenticated;

revoke all on function public.update_role(uuid, text, text[]) from public, anon;
grant execute on function public.update_role(uuid, text, text[]) to authenticated;

revoke all on function public.delete_role(uuid) from public, anon;
grant execute on function public.delete_role(uuid) to authenticated;
