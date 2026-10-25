-- 0017: 客户子菜单独立权限
-- 背景：客户下有三个子菜单，此前统一由 customers.browse 控制，无法单独授权。
--       现拆成三组互相独立的权限：
--         customers.*             -> 全部客户  /customers
--         customers.high_value.*  -> 高价值客户 /customers/segments/high-value (status = vip)
--         customers.at_risk.*     -> 流失风险客户 /customers/segments/at-risk (status = atRisk)
--       分群页不提供「新建 / 导入」，因此两个分群只有 browse/update/delete/export。
-- 幂等：可重复执行。

-- ============ 1. 目录项 ============
insert into public.permissions (key, module, sort)
values
  ('customers.high_value.browse', 'customers', 26),
  ('customers.high_value.update', 'customers', 27),
  ('customers.high_value.delete', 'customers', 28),
  ('customers.high_value.export', 'customers', 29),
  ('customers.at_risk.browse',    'customers', 30),
  ('customers.at_risk.update',    'customers', 31),
  ('customers.at_risk.delete',    'customers', 32),
  ('customers.at_risk.export',    'customers', 33)
on conflict (key) do update
  set module = excluded.module,
      sort   = excluded.sort;

-- ============ 2. 存量角色平滑继承 ============
-- 原来能做什么，拆分后仍能做：按原 customers.* 授予对应分群权限。
insert into public.role_permissions (role_id, permission_key)
select rp.role_id, m.new_key
from public.role_permissions rp
join (values
  ('customers.browse', 'customers.high_value.browse'),
  ('customers.update', 'customers.high_value.update'),
  ('customers.delete', 'customers.high_value.delete'),
  ('customers.export', 'customers.high_value.export'),
  ('customers.browse', 'customers.at_risk.browse'),
  ('customers.update', 'customers.at_risk.update'),
  ('customers.delete', 'customers.at_risk.delete'),
  ('customers.export', 'customers.at_risk.export')
) as m(old_key, new_key) on rp.permission_key = m.old_key
on conflict (role_id, permission_key) do nothing;

-- ============ 3. RLS：分群权限按行状态放行 ============
-- 只有某个分群权限的角色，只能读写该分群的行（RLS 是行级，正好能表达）。

drop policy if exists "customers_select_permission" on public.customers;
create policy "customers_select_permission" on public.customers
  for select to authenticated
  using (
    public.has_org_permission(org_id, 'customers.browse')
    or (status = 'vip'    and public.has_org_permission(org_id, 'customers.high_value.browse'))
    or (status = 'atRisk' and public.has_org_permission(org_id, 'customers.at_risk.browse'))
  );

drop policy if exists "customers_update_permission" on public.customers;
create policy "customers_update_permission" on public.customers
  for update to authenticated
  using (
    public.has_org_permission(org_id, 'customers.update')
    or (status = 'vip'    and public.has_org_permission(org_id, 'customers.high_value.update'))
    or (status = 'atRisk' and public.has_org_permission(org_id, 'customers.at_risk.update'))
  )
  with check (
    public.has_org_permission(org_id, 'customers.update')
    or (status = 'vip'    and public.has_org_permission(org_id, 'customers.high_value.update'))
    or (status = 'atRisk' and public.has_org_permission(org_id, 'customers.at_risk.update'))
  );

drop policy if exists "customers_delete_permission" on public.customers;
create policy "customers_delete_permission" on public.customers
  for delete to authenticated
  using (
    public.has_org_permission(org_id, 'customers.delete')
    or (status = 'vip'    and public.has_org_permission(org_id, 'customers.high_value.delete'))
    or (status = 'atRisk' and public.has_org_permission(org_id, 'customers.at_risk.delete'))
  );

-- insert 仍由 customers.create 控制（分群页不提供新建）。

-- ============ 4. 创建组织：固定角色清单补上分群权限 ============
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
      'customers.high_value.browse', 'customers.high_value.update', 'customers.high_value.export',
      'customers.at_risk.browse', 'customers.at_risk.update', 'customers.at_risk.export',
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
      'customers.high_value.browse', 'customers.high_value.update', 'customers.high_value.export',
      'customers.at_risk.browse', 'customers.at_risk.update', 'customers.at_risk.export',
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
      'customers.high_value.browse',
      'customers.at_risk.browse',
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
