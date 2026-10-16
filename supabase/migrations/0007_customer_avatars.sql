-- 0007: 客户头像 —— customers.avatar_url 列 + Supabase Storage 公开桶
-- 结构：
--   customers 新增 avatar_url text（存 public URL，可空 = 无头像）。
--   storage 新建公开桶 customer-avatars：头像属低敏公开资源，
--   读走公开 CDN URL（<AvatarImage> 直接 src），无需对象级读 policy。
-- 路径约定：{org_id}/{uuid}.{ext} —— 首段 folder 即组织 id，
--   写 policy 据此把"能往哪个组织的文件夹写"锁死为该组织 admin。
-- 幂等：bucket on conflict 更新、policy drop if exists。
-- 旧文件清理（替换/删除客户后的孤儿对象）不在本迁移范围，
--   由业务层演进（pg_cron 定期清扫或删除时同步 remove）。

-- ============ 1. customers.avatar_url ============
alter table public.customers
  add column if not exists avatar_url text;

-- ============ 2. 公开桶 ============
insert into storage.buckets (id, name, public)
values ('customer-avatars', 'customer-avatars', true)
on conflict (id) do update set public = true;

-- ============ 3. storage.objects 写入 policy ============
-- 读：公开桶走 /object/public/ 直链，不经过 RLS，无需 select policy。
-- 写：authenticated + 该组织 admin + 路径首段 folder 必须等于其组织 id
--     （防跨组织写：把文件传到别人的 folder 前缀下）。
-- 复用 0004 的 security definer helper（避免 members RLS 递归）。

drop policy if exists "customer_avatars_insert_admin" on storage.objects;
create policy "customer_avatars_insert_admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'customer-avatars'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "customer_avatars_update_admin" on storage.objects;
create policy "customer_avatars_update_admin" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'customer-avatars'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'customer-avatars'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "customer_avatars_delete_admin" on storage.objects;
create policy "customer_avatars_delete_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'customer-avatars'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );
