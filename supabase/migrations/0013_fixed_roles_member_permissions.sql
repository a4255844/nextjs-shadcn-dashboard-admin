-- 0013: 固定角色 + 成员额外权限
-- 1) 固定系统角色：Admin / Manager / Sales / Viewer（权限固定，不可改不可删）
-- 2) member_permissions：成员级额外权限，叠加在角色权限之上，仅 members.manage 可授予
-- 3) 权限判定统一改为"角色权限 ∪ 额外权限"
-- 幂等：可重复执行。

-- ============ 1. 允许一个组织拥有多个系统角色 ============
drop index if exists public.roles_one_system_per_org;

-- ============ 2. 补齐固定角色（存量组织） ============
insert into public.roles (org_id, name, is_system)
select o.id, v.name, true
from public.organizations o
cross join (values ('Admin'), ('Manager'), ('Sales'), ('Viewer')) as v(name)
on conflict (org_id, name) do nothing;

-- 固定角色的权限不允许人工改动：清空后按固定清单重写
delete from public.role_permissions rp
using public.roles r
where rp.role_id = r.id and r.is_system;

with fixed(role_name, permission_key) as (
  values
    ('Admin',   'dashboard.browse'),
    ('Admin',   'customers.browse'),
    ('Admin',   'customers.create'),
    ('Admin',   'customers.update'),
    ('Admin',   'customers.delete'),
    ('Admin',   'customers.export'),
    ('Admin',   'customers.import'),
    ('Admin',   'orders.browse'),
    ('Admin',   'orders.create'),
    ('Admin',   'orders.update'),
    ('Admin',   'orders.delete'),
    ('Admin',   'orders.export'),
    ('Admin',   'orders.import'),
    ('Admin',   'members.browse'),
    ('Admin',   'members.invite'),
    ('Admin',   'members.manage'),
    ('Admin',   'org.update'),
    ('Admin',   'org.delete'),

    ('Manager', 'dashboard.browse'),
    ('Manager', 'customers.browse'),
    ('Manager', 'customers.create'),
    ('Manager', 'customers.update'),
    ('Manager', 'customers.export'),
    ('Manager', 'customers.import'),
    ('Manager', 'orders.browse'),
    ('Manager', 'orders.create'),
    ('Manager', 'orders.update'),
    ('Manager', 'orders.export'),
    ('Manager', 'orders.import'),
    ('Manager', 'members.browse'),
    ('Manager', 'members.invite'),
    ('Manager', 'org.update'),

    ('Sales',   'dashboard.browse'),
    ('Sales',   'customers.browse'),
    ('Sales',   'customers.create'),
    ('Sales',   'customers.update'),
    ('Sales',   'customers.export'),
    ('Sales',   'orders.browse'),
    ('Sales',   'orders.create'),
    ('Sales',   'orders.update'),
    ('Sales',   'orders.export'),
    ('Sales',   'members.browse'),

    ('Viewer',  'dashboard.browse'),
    ('Viewer',  'customers.browse'),
    ('Viewer',  'orders.browse'),
    ('Viewer',  'members.browse')
)
insert into public.role_permissions (role_id, permission_key)
select r.id, f.permission_key
from public.roles r
join fixed f on f.role_name = r.name
where r.is_system
on conflict do nothing;

-- ============ 3. 成员额外权限 ============
create table if not exists public.member_permissions (
  member_id      uuid not null references public.members (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (member_id, permission_key)
);

create index if not exists member_permissions_member_id_idx
  on public.member_permissions (member_id);

alter table public.member_permissions enable row level security;

-- 本人可读自己的额外权限；管理员可读本组织全部
drop policy if exists "member_permissions_select_self_or_manage" on public.member_permissions;
create policy "member_permissions_select_self_or_manage" on public.member_permissions
  for select to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = member_id
        and (
          m.user_id = auth.uid()
          or public.has_org_permission(m.org_id, 'members.manage')
        )
    )
  );

drop policy if exists "member_permissions_insert_manage" on public.member_permissions;
create policy "member_permissions_insert_manage" on public.member_permissions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.members m
      where m.id = member_id
        and public.has_org_permission(m.org_id, 'members.manage')
    )
  );

drop policy if exists "member_permissions_delete_manage" on public.member_permissions;
create policy "member_permissions_delete_manage" on public.member_permissions
  for delete to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = member_id
        and public.has_org_permission(m.org_id, 'members.manage')
    )
  );

-- ============ 4. 权限判定：角色权限 ∪ 额外权限 ============
create or replace function public.has_member_permission(
  p_member_id uuid,
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
    where m.id = p_member_id
      and (
        exists (
          select 1 from public.role_permissions rp
          where rp.role_id = m.role_id
            and rp.permission_key = check_permission
        )
        or exists (
          select 1 from public.member_permissions mp
          where mp.member_id = m.id
            and mp.permission_key = check_permission
        )
      )
  )
$$;

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
    where m.org_id = check_org_id
      and m.user_id = auth.uid()
      and public.has_member_permission(m.id, check_permission)
  )
$$;

-- 兼容旧调用（storage policy 等）：持有 members.manage 即视为管理员
create or replace function public.is_org_admin(check_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_org_permission(check_org_id, 'members.manage')
$$;

create or replace function public.my_org_permissions(p_org_id uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select distinct k
  from (
    select rp.permission_key as k
    from public.members m
    join public.role_permissions rp on rp.role_id = m.role_id
    where m.org_id = p_org_id and m.user_id = auth.uid()
    union
    select mp.permission_key as k
    from public.members m
    join public.member_permissions mp on mp.member_id = m.id
    where m.org_id = p_org_id and m.user_id = auth.uid()
  ) t
  order by 1
$$;

-- ============ 5. 成员名单：带额外权限 ============
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
  avatar_url text,
  extra_permissions text[]
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
    p.avatar_url,
    coalesce(
      array_agg(mp.permission_key order by mp.permission_key)
        filter (where mp.permission_key is not null),
      '{}'
    )
  from public.members m
  join public.roles r on r.id = m.role_id
  left join public.profiles p on p.id = m.user_id
  left join public.member_permissions mp on mp.member_id = m.id
  where m.org_id = p_org_id
  group by
    m.user_id, m.role_id, r.name, m.created_at,
    p.email, p.first_name, p.last_name, p.avatar_url
  order by m.created_at, m.user_id;
end;
$$;

-- ============ 6. 变更角色 / 移除成员：last_admin 改为"至少一人持有 members.manage" ============
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
  v_role_org uuid;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if not public.has_org_permission(p_org_id, 'members.manage') then
    raise exception 'not_allowed';
  end if;

  select r.org_id into v_role_org
  from public.roles r
  where r.id = p_role_id;

  if v_role_org is null or v_role_org <> p_org_id then
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

  -- 不变量：组织至少保留一名持有 members.manage 的成员（角色或额外权限均可）
  if not exists (
    select 1 from public.members m
    where m.org_id = p_org_id and m.user_id <> p_user_id
      and public.has_member_permission(m.id, 'members.manage')
  ) then
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

  if not exists (
    select 1 from public.members m
    where m.org_id = p_org_id
      and m.user_id <> p_user_id
      and public.has_member_permission(m.id, 'members.manage')
  ) then
    raise exception 'last_admin';
  end if;

  delete from public.members
  where org_id = p_org_id and user_id = p_user_id;
end;
$$;

-- ============ 7. 设置成员额外权限 ============
create or replace function public.set_member_extra_permissions(
  p_org_id uuid,
  p_user_id uuid,
  p_permissions text[]
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_member uuid;
  v_role_has_manage boolean;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if not public.has_org_permission(p_org_id, 'members.manage') then
    raise exception 'not_allowed';
  end if;

  perform 1
  from public.members m
  where m.org_id = p_org_id
  order by m.user_id
  for update;

  select m.id into v_member
  from public.members m
  where m.org_id = p_org_id and m.user_id = p_user_id;

  if v_member is null then
    raise exception 'not_member';
  end if;

  select exists (
    select 1
    from public.role_permissions rp
    join public.members m on m.role_id = rp.role_id
    where m.id = v_member and rp.permission_key = 'members.manage'
  ) into v_role_has_manage;

  -- 不变量：不能把组织最后一个可管理成员降权
  if not v_role_has_manage
    and not ('members.manage' = any (coalesce(p_permissions, '{}')))
    and not exists (
      select 1 from public.members m
      where m.org_id = p_org_id and m.id <> v_member
        and public.has_member_permission(m.id, 'members.manage')
    )
  then
    raise exception 'last_admin';
  end if;

  begin
    delete from public.member_permissions where member_id = v_member;

    insert into public.member_permissions (member_id, permission_key)
    select v_member, k
    from unnest(coalesce(p_permissions, '{}')) as k
    where k <> ''
    on conflict do nothing;
  exception
    when foreign_key_violation then
      raise exception 'invalid_permission';
  end;
end;
$$;

-- ============ 8. 创建组织：写入 4 个固定角色 ============
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
  values
    (v_org, 'Admin', true),
    (v_org, 'Manager', true),
    (v_org, 'Sales', true),
    (v_org, 'Viewer', true);

  insert into public.role_permissions (role_id, permission_key)
  select r.id, p.key from public.roles r
  cross join public.permissions p
  where r.org_id = v_org and r.name = 'Admin';

  insert into public.role_permissions (role_id, permission_key)
  select r.id, p.key from public.roles r
  cross join public.permissions p
  where r.org_id = v_org and r.name = 'Manager'
    and p.key in (
      'dashboard.browse',
      'customers.browse', 'customers.create', 'customers.update',
      'customers.export', 'customers.import',
      'orders.browse', 'orders.create', 'orders.update',
      'orders.export', 'orders.import',
      'members.browse', 'members.invite',
      'org.update'
    );

  insert into public.role_permissions (role_id, permission_key)
  select r.id, p.key from public.roles r
  cross join public.permissions p
  where r.org_id = v_org and r.name = 'Sales'
    and p.key in (
      'dashboard.browse',
      'customers.browse', 'customers.create', 'customers.update', 'customers.export',
      'orders.browse', 'orders.create', 'orders.update', 'orders.export',
      'members.browse'
    );

  insert into public.role_permissions (role_id, permission_key)
  select r.id, p.key from public.roles r
  cross join public.permissions p
  where r.org_id = v_org and r.name = 'Viewer'
    and p.key in (
      'dashboard.browse',
      'customers.browse',
      'orders.browse',
      'members.browse'
    );

  select r.id into v_role
  from public.roles r
  where r.org_id = v_org and r.name = 'Admin';

  insert into public.members (org_id, user_id, role_id)
  values (v_org, v_user, v_role);

  return v_org;
end;
$$;

-- ============ 9. RPC 执行权限 ============
revoke all on function public.has_member_permission(uuid, text) from public, anon;
grant execute on function public.has_member_permission(uuid, text) to authenticated;

revoke all on function public.has_org_permission(uuid, text) from public, anon;
grant execute on function public.has_org_permission(uuid, text) to authenticated;

revoke all on function public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_org_admin(uuid) to authenticated;

revoke all on function public.my_org_permissions(uuid) from public, anon;
grant execute on function public.my_org_permissions(uuid) to authenticated;

revoke all on function public.list_org_members(uuid) from public, anon;
grant execute on function public.list_org_members(uuid) to authenticated;

revoke all on function public.update_member_role(uuid, uuid, uuid) from public, anon;
grant execute on function public.update_member_role(uuid, uuid, uuid) to authenticated;

revoke all on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

revoke all on function public.set_member_extra_permissions(uuid, uuid, text[]) from public, anon;
grant execute on function public.set_member_extra_permissions(uuid, uuid, text[]) to authenticated;

revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;
