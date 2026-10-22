-- 0009: Orders 模块 —— 订单表 + RLS + 订单号自动生成 RPC
-- orders 与 customers 形成经典一对多关系链，所有策略复用 0004 的
-- is_org_member / is_org_admin 模式；generate_order_number 用
-- security definer 绕开 RLS 查询自增序号。

-- ============ 1. order_status 枚举 ============
do $$ begin
  create type public.order_status as enum ('pending', 'paid', 'refunded', 'cancelled');
exception when duplicate_object then null; end $$;

-- ============ 2. orders 表 ============
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  customer_id     uuid not null references public.customers(id) on delete cascade,
  number          text not null,
  amount          numeric(12,2) not null check (amount >= 0),
  status          public.order_status not null default 'pending',
  payment_method  text,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (org_id, number)
);

create index if not exists orders_org_id_idx on public.orders (org_id);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_status_idx on public.orders (status);

-- ============ 3. RLS ============
alter table public.orders enable row level security;

drop policy if exists "orders_select_member" on public.orders;
create policy "orders_select_member" on public.orders
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists "orders_insert_admin" on public.orders;
create policy "orders_insert_admin" on public.orders
  for insert to authenticated
  with check (public.is_org_admin(org_id));

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders
  for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_delete_admin" on public.orders
  for delete to authenticated
  using (public.is_org_admin(org_id));

-- ============ 4. generate_order_number RPC ============
-- security definer + set search_path = ''：绕开 orders RLS 查序号，
-- 同时防 search_path 劫持。按组织 + 日期内计数生成，跨组织互不干扰。
create or replace function public.generate_order_number(p_org_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date text := to_char(now() at time zone 'UTC', 'YYYYMMDD');
  v_seq  int;
begin
  select coalesce(
    (select count(*)
     from public.orders
     where org_id = p_org_id
       and number like 'ORD-' || v_date || '-%'),
    0
  ) into v_seq;
  return 'ORD-' || v_date || '-' || lpad((v_seq + 1)::text, 4, '0');
end;
$$;

revoke all on function public.generate_order_number(uuid) from public;
grant execute on function public.generate_order_number(uuid) to authenticated;
