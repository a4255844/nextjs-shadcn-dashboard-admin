-- 0008: 用户头像 —— Supabase Storage 公开桶 user-avatars
-- profiles.avatar_url 列在 0001 已存在，本迁移只建桶与 policy。
-- 路径约定：{user_id}/{uuid}.{ext} —— 首段 folder 即用户 id，
--   写 policy 锁死"只能往自己的 folder 写"（auth.uid() 比对）。
-- 与 customer-avatars 的区别：用户头像不属于组织维度，随账号走。
-- 读走公开 CDN URL，无需对象级读 policy。
-- 旧文件孤儿清理不在本迁移范围（同 0007 的取舍）。

insert into storage.buckets (id, name, public)
values ('user-avatars', 'user-avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "user_avatars_insert_own" on storage.objects;
create policy "user_avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists "user_avatars_update_own" on storage.objects;
create policy "user_avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  )
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists "user_avatars_delete_own" on storage.objects;
create policy "user_avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
