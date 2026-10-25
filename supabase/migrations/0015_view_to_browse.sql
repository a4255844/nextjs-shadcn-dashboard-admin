-- 0015: 权限语义调整 —— *.view 重命名为 *.browse
-- 背景：菜单/路由级权限统一叫 "浏览"（browse），create/update/delete/export/import
--       为按钮级子权限。此前用 view 表示同一语义，现统一 key 与文案。
-- 注意：permissions.key 被 role_permissions / member_permissions 以
--       ON UPDATE NO ACTION 外键引用，直接 UPDATE 父表 key 会触发 23503。
--       因此顺序必须是：先补齐新 key -> 再把引用指向新 key -> 最后删除旧 key。
-- 幂等：可重复执行。

-- ============ 1. 目录：先补齐 *.browse 项（沿用旧行的 module/sort） ============
insert into public.permissions (key, module, sort)
select replace(key, '.view', '.browse'), module, sort
from public.permissions
where key like '%.view'
on conflict (key) do nothing;

-- ============ 2. 角色权限：新增 browse 行后删除 view 行 ============
insert into public.role_permissions (role_id, permission_key)
select role_id, replace(permission_key, '.view', '.browse')
from public.role_permissions
where permission_key like '%.view'
on conflict (role_id, permission_key) do nothing;

delete from public.role_permissions where permission_key like '%.view';

-- ============ 3. 成员级覆盖：保留 granted（授予/撤销）语义 ============
do $$
begin
  if to_regclass('public.member_permissions') is not null then
    insert into public.member_permissions (member_id, permission_key, granted)
    select member_id, replace(permission_key, '.view', '.browse'), granted
    from public.member_permissions
    where permission_key like '%.view'
    on conflict (member_id, permission_key) do nothing;

    delete from public.member_permissions where permission_key like '%.view';
  end if;
end $$;

-- ============ 4. 删除旧目录项（此时已无引用） ============
delete from public.permissions where key like '%.view';

-- ============ 5. 引用 view key 的 RLS 策略同步更名 ============
drop policy if exists "customers_select_permission" on public.customers;
create policy "customers_select_permission" on public.customers
  for select to authenticated
  using (public.has_org_permission(org_id, 'customers.browse'));

drop policy if exists "orders_select_permission" on public.orders;
create policy "orders_select_permission" on public.orders
  for select to authenticated
  using (public.has_org_permission(org_id, 'orders.browse'));

-- ============ 6. 创建组织：固定角色权限清单改用 browse key ============
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
