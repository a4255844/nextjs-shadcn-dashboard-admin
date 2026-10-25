-- 0014: 角色权限可编辑 + 成员级权限覆盖（授予 / 撤销）
-- 1) member_permissions 增加 granted：true = 额外授予，false = 撤销角色继承的权限
-- 2) 权限判定 = (角色权限 - 撤销) ∪ 额外授予
-- 3) update_role 允许修改固定系统角色的权限（名称仍锁定），并加 last_admin 保护
-- 4) list_org_members 同时返回 extra_permissions / denied_permissions
-- 5) 新 RPC set_member_permission_overrides 替换旧的 set_member_extra_permissions
-- 幂等：可重复执行。

-- ============ 1. 覆盖标记 ============
alter table public.member_permissions
  add column if not exists granted boolean not null default true;

-- ============ 2. 权限判定：角色权限 - 撤销 ∪ 授予 ============
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
        (
          exists (
            select 1 from public.role_permissions rp
            where rp.role_id = m.role_id
              and rp.permission_key = check_permission
          )
          and not exists (
            select 1 from public.member_permissions mp
            where mp.member_id = m.id
              and mp.permission_key = check_permission
              and not mp.granted
          )
        )
        or exists (
          select 1 from public.member_permissions mp
          where mp.member_id = m.id
            and mp.permission_key = check_permission
            and mp.granted
        )
      )
  )
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
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and not exists (
        select 1 from public.member_permissions mp
        where mp.member_id = m.id
          and mp.permission_key = rp.permission_key
          and not mp.granted
      )
    union
    select mp.permission_key as k
    from public.members m
    join public.member_permissions mp on mp.member_id = m.id
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and mp.granted
  ) t
  order by 1
$$;

-- ============ 3. 成员名单：授予 + 撤销 ============
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
  extra_permissions text[],
  denied_permissions text[]
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
        filter (where mp.granted),
      '{}'
    ),
    coalesce(
      array_agg(mp.permission_key order by mp.permission_key)
        filter (where mp.granted is false),
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

-- ============ 4. 角色权限可编辑（含固定角色，仅限权限） ============
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

  if not public.has_org_permission(v_org, 'members.manage') then
    raise exception 'not_allowed';
  end if;

  -- 组织级行锁：串行化 last_admin 判定
  perform 1
  from public.members m
  where m.org_id = v_org
  order by m.user_id
  for update;

  -- 固定角色：名称锁定，只能改权限
  if not v_system then
    v_name := btrim(coalesce(p_name, ''));
    if char_length(v_name) < 1 or char_length(v_name) > 40 then
      raise exception 'invalid_name';
    end if;
  end if;

  -- 不变量：改完权限后，组织仍需至少一名成员持有 members.manage
  if not exists (
    select 1
    from public.members m
    where m.org_id = v_org
      and (
        (
          m.role_id = p_role_id
          and (
            (
              'members.manage' = any (coalesce(p_permissions, '{}'))
              and not exists (
                select 1 from public.member_permissions mp
                where mp.member_id = m.id
                  and mp.permission_key = 'members.manage'
                  and not mp.granted
              )
            )
            or exists (
              select 1 from public.member_permissions mp
              where mp.member_id = m.id
                and mp.permission_key = 'members.manage'
                and mp.granted
            )
          )
        )
        or (
          m.role_id <> p_role_id
          and public.has_member_permission(m.id, 'members.manage')
        )
      )
  ) then
    raise exception 'last_admin';
  end if;

  if not v_system then
    begin
      update public.roles set name = v_name where id = p_role_id;
    exception
      when unique_violation then
        raise exception 'role_name_taken';
    end;
  end if;

  delete from public.role_permissions where role_id = p_role_id;

  begin
    insert into public.role_permissions (role_id, permission_key)
    select p_role_id, k
    from unnest(coalesce(p_permissions, '{}')) as k
    where k <> ''
    on conflict do nothing;
  exception
    when foreign_key_violation then
      raise exception 'invalid_permission';
  end;
end;
$$;

-- ============ 5. 成员级权限覆盖 ============
drop function if exists public.set_member_extra_permissions(uuid, uuid, text[]);

create or replace function public.set_member_permission_overrides(
  p_org_id uuid,
  p_user_id uuid,
  p_granted text[],
  p_denied text[]
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_member uuid;
  v_role uuid;
  v_role_has_manage boolean;
  v_target_manage boolean;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  if not public.has_org_permission(p_org_id, 'members.manage') then
    raise exception 'not_allowed';
  end if;

  -- 同一权限不能既授予又撤销
  if exists (
    select 1
    from unnest(coalesce(p_granted, '{}')) as g
    where g = any (coalesce(p_denied, '{}'))
  ) then
    raise exception 'invalid_permission';
  end if;

  perform 1
  from public.members m
  where m.org_id = p_org_id
  order by m.user_id
  for update;

  select m.id, m.role_id into v_member, v_role
  from public.members m
  where m.org_id = p_org_id and m.user_id = p_user_id;

  if v_member is null then
    raise exception 'not_member';
  end if;

  select exists (
    select 1
    from public.role_permissions rp
    where rp.role_id = v_role
      and rp.permission_key = 'members.manage'
  ) into v_role_has_manage;

  v_target_manage :=
    (
      v_role_has_manage
      and not ('members.manage' = any (coalesce(p_denied, '{}')))
    )
    or ('members.manage' = any (coalesce(p_granted, '{}')));

  -- 不变量：不能撤销组织最后一名可管理成员的管理权限
  if not v_target_manage and not exists (
    select 1 from public.members m
    where m.org_id = p_org_id
      and m.id <> v_member
      and public.has_member_permission(m.id, 'members.manage')
  ) then
    raise exception 'last_admin';
  end if;

  begin
    delete from public.member_permissions where member_id = v_member;

    insert into public.member_permissions (member_id, permission_key, granted)
    select v_member, k, true
    from unnest(coalesce(p_granted, '{}')) as k
    where k <> ''
    on conflict (member_id, permission_key) do update set granted = true;

    insert into public.member_permissions (member_id, permission_key, granted)
    select v_member, k, false
    from unnest(coalesce(p_denied, '{}')) as k
    where k <> ''
    on conflict (member_id, permission_key) do update set granted = false;
  exception
    when foreign_key_violation then
      raise exception 'invalid_permission';
  end;
end;
$$;

-- ============ 6. 更换角色时清除成员级覆盖 ============
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
  v_member uuid;
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

  select m.id into v_member
  from public.members m
  where m.org_id = p_org_id and m.user_id = p_user_id;

  if v_member is null then
    raise exception 'not_member';
  end if;

  -- 不变量：变更后组织仍需至少一名持有 members.manage 的成员
  -- （目标成员的新角色本身即按新角色权限计算，故排除目标后单独判定）
  if not exists (
    select 1 from public.members m
    where m.org_id = p_org_id
      and m.id <> v_member
      and public.has_member_permission(m.id, 'members.manage')
  ) and not exists (
    select 1 from public.role_permissions rp
    where rp.role_id = p_role_id
      and rp.permission_key = 'members.manage'
  ) then
    raise exception 'last_admin';
  end if;

  update public.members
  set role_id = p_role_id
  where id = v_member;

  -- 角色变了，旧的成员级授予/撤销失去语义，一并清除
  delete from public.member_permissions where member_id = v_member;
end;
$$;

-- ============ 7. RPC 执行权限 ============
revoke all on function public.has_member_permission(uuid, text) from public, anon;
grant execute on function public.has_member_permission(uuid, text) to authenticated;

revoke all on function public.my_org_permissions(uuid) from public, anon;
grant execute on function public.my_org_permissions(uuid) to authenticated;

revoke all on function public.list_org_members(uuid) from public, anon;
grant execute on function public.list_org_members(uuid) to authenticated;

revoke all on function public.update_role(uuid, text, text[]) from public, anon;
grant execute on function public.update_role(uuid, text, text[]) to authenticated;

revoke all on function public.update_member_role(uuid, uuid, uuid) from public, anon;
grant execute on function public.update_member_role(uuid, uuid, uuid) to authenticated;

revoke all on function public.set_member_permission_overrides(uuid, uuid, text[], text[]) from public, anon;
grant execute on function public.set_member_permission_overrides(uuid, uuid, text[], text[]) to authenticated;
