-- 0001_profiles.sql
-- profiles 表：每行对应一个 auth.users 中的用户（1:1）。
-- 真实项目通过 `supabase db push` 执行；学习阶段可粘贴到
-- Dashboard -> SQL Editor 运行，效果一致。

-- ============ 1. 表结构 ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ 2. RLS：用户只能读写自己的 profile ============
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============ 3. 注册触发器：创建用户时自动写入 profile ============
-- security definer：触发器以内建高权限运行（新用户此刻还没有会话），
-- 绕过 RLS 完成插入；函数体只写一行固定数据，无可被利用的注入面。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
