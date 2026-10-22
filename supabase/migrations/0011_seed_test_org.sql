-- 0011: 为 test Org 1 补充同样的 seed 数据
-- 让所有登录用户都能看到 Customers + Orders

insert into public.customers
  (org_id, name, email, company, status, spent, created_at, avatar_color)
select
  'b2618342-ad18-45d6-a4a0-91dad815d5ef'::uuid,
  name,
  email,
  company,
  status,
  spent,
  created_at,
  avatar_color
from public.customers
where org_id = '11111111-1111-4111-8111-111111111111'
on conflict (org_id, email) do nothing;

insert into public.orders
  (org_id, customer_id, number, amount, status, payment_method, notes, created_at)
select
  'b2618342-ad18-45d6-a4a0-91dad815d5ef'::uuid,
  c.id,
  'TEST-' || o.number,
  o.amount,
  o.status,
  o.payment_method,
  o.notes,
  o.created_at + interval '3 days'
from public.orders o
join public.customers src
  on src.id = o.customer_id
 and src.org_id = '11111111-1111-4111-8111-111111111111'
join public.customers c
  on c.org_id = 'b2618342-ad18-45d6-a4a0-91dad815d5ef'
 and c.email = src.email
where o.org_id = '11111111-1111-4111-8111-111111111111'
on conflict (org_id, number) do nothing;
