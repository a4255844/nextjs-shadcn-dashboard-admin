-- 0016: 电商看板独立菜单权限
-- 背景：侧边栏「电商」与「仪表盘」是两个菜单，但此前共用 dashboard.browse，
--       权限树无法表达该菜单。这里新增 dashboard.ecommerce.browse，
--       并保持存量角色按原有访问范围平滑继承（原本有 dashboard.browse 的即授予）。
-- 幂等：可重复执行。

-- ============ 1. 目录项 ============
insert into public.permissions (key, module, sort)
values ('dashboard.ecommerce.browse', 'dashboard', 11)
on conflict (key) do update
  set module = excluded.module,
      sort   = excluded.sort;

-- ============ 2. 存量角色继承 ============
insert into public.role_permissions (role_id, permission_key)
select rp.role_id, 'dashboard.ecommerce.browse'
from public.role_permissions rp
where rp.permission_key = 'dashboard.browse'
on conflict (role_id, permission_key) do nothing;

-- ============ 3. 创建组织：固定角色清单补上新菜单 ============
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
      'dashboard.browse', 'dashboard.ecommerce.browse',
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
      'dashboard.browse', 'dashboard.ecommerce.browse',
      'customers.browse', 'customers.create', 'customers.update', 'customers.export',
      'orders.browse', 'orders.create', 'orders.update', 'orders.export',
      'members.browse'
    );

  insert into public.role_permissions (role_id, permission_key)
  select r.id, p.key from public.roles r
  cross join public.permissions p
  where r.org_id = v_org and r.name = 'Viewer'
    and p.key in (
      'dashboard.browse', 'dashboard.ecommerce.browse',
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
