-- 0010: 补充 customers + 生成 orders seed 数据
-- 幂等：customers 用 (org_id, email) 去重，orders 用 (org_id, number) 去重。

-- ============ 1. 新增 20 个 customers ============
insert into public.customers
  (org_id, name, email, company, status, spent, created_at, avatar_color)
values
  ('11111111-1111-4111-8111-111111111111', 'Ava Thompson',   'ava.thompson@velvet.co',   'Velvet Industries',  'active',   11200, '2024-02-14', 'bg-chart-1/20'),
  ('11111111-1111-4111-8111-111111111111', 'Kenji Watanabe',  'kenji@sakura-tech.jp',     'Sakura Tech',        'vip',      47800, '2023-05-30', 'bg-chart-2/20'),
  ('11111111-1111-4111-8111-111111111111', 'Isabella Ferrari','isabella@roma-design.it',  'Roma Design',        'active',    5600, '2025-01-18', 'bg-chart-3/20'),
  ('11111111-1111-4111-8111-111111111111', 'Raj Patel',       'raj@bombayworks.in',       'Bombay Works',       'atRisk',    2950, '2024-08-22', 'bg-destructive/20'),
  ('11111111-1111-4111-8111-111111111111', 'Emma Johnson',    'emma@greenleaf.co.uk',     'Greenleaf Ltd',      'inactive',     0, '2023-04-07', 'bg-muted'),
  ('11111111-1111-4111-8111-111111111111', 'Carlos Mendes',   'carlos@amazonia.br',       'Amazonia SaaS',      'active',   19800, '2024-06-11', 'bg-chart-1/20'),
  ('11111111-1111-4111-8111-111111111111', 'Yara Khalid',     'yara@dunecloud.sa',        'Dune Cloud',         'vip',      38500, '2023-07-19', 'bg-chart-2/20'),
  ('11111111-1111-4111-8111-111111111111', 'Jakob Novak',     'jakob@pragmasoft.cz',      'PragmaSoft',         'active',    7300, '2025-03-01', 'bg-chart-3/20'),
  ('11111111-1111-4111-8111-111111111111', 'Nia Edwards',     'nia@ember-ai.com',         'Ember AI',           'atRisk',    1450, '2024-11-05', 'bg-destructive/20'),
  ('11111111-1111-4111-8111-111111111111', 'Felix Dubois',    'felix@nouvelle.fr',        'Nouvelle Studio',    'vip',      29600, '2023-10-24', 'bg-chart-2/20'),
  ('11111111-1111-4111-8111-111111111111', 'Hana Kim',        'hana@morning.co.kr',       'Morning Corp',       'active',    4100, '2025-04-28', 'bg-chart-1/20'),
  ('11111111-1111-4111-8111-111111111111', 'Theo Van Dijk',   'theo@windsurf.nl',         'Windsurf BV',        'inactive',     0, '2023-01-15', 'bg-muted'),
  ('11111111-1111-4111-8111-111111111111', 'Sofia Alvarez',   'sofia@mesa.mx',            'Mesa Digital',       'active',   15400, '2024-05-03', 'bg-chart-3/20'),
  ('11111111-1111-4111-8111-111111111111', 'Kofi Mensah',     'kofi@accra-labs.gh',       'Accra Labs',         'atRisk',    2100, '2024-12-12', 'bg-destructive/20'),
  ('11111111-1111-4111-8111-111111111111', 'Julia Becker',    'julia@steinweg.at',        'Steinweg GmbH',      'vip',      55200, '2023-02-28', 'bg-chart-2/20'),
  ('11111111-1111-4111-8111-111111111111', 'Marco Bianchi',   'marco@lagom.ch',           'Lagom AG',           'active',    8900, '2025-02-09', 'bg-chart-1/20'),
  ('11111111-1111-4111-8111-111111111111', 'Anika Sharma',    'anika@peaksnow.io',        'PeakSnow',           'active',   13700, '2024-07-29', 'bg-chart-3/20'),
  ('11111111-1111-4111-8111-111111111111', 'Oscar Reyes',     'oscar@valpara.cl',         'Valpara SpA',        'atRisk',    1800, '2024-09-14', 'bg-destructive/20'),
  ('11111111-1111-4111-8111-111111111111', 'Freya Hansen',    'freya@aurora.dk',          'Aurora Design',      'vip',      41300, '2023-06-05', 'bg-chart-2/20'),
  ('11111111-1111-4111-8111-111111111111', 'David Cohen',     'david@eastgate.co.il',     'Eastgate Tech',      'active',    6200, '2025-01-30', 'bg-chart-1/20')
on conflict (org_id, email) do nothing;

-- ============ 2. orders seed ============
-- 为每个客户生成 1-4 条订单；订单号用 ORD-YYYYMMDD-NNNN 格式确保幂等。
-- 日期跨度约 1 个月（current_date - 10 到 -40）。
with customer_pool as (
  select id from public.customers
  where org_id = '11111111-1111-4111-8111-111111111111'
),
seed_orders as (
  select
    c.id as customer_id,
    to_char(d, 'YYYYMMDD') as date_key,
    seq as seq_num,
    round((random() * 9500 + 50)::numeric, 2) as amount,
    (array['pending','paid','paid','paid','refunded','cancelled'])[1 + floor(random() * 6)::int]::public.order_status as status,
    (array['Credit card','PayPal','Stripe','Bank transfer','Crypto','Apple Pay','Google Pay','Invoice'])[1 + floor(random() * 8)::int] as payment_method,
    case when random() > 0.7 then 'Regular monthly subscription' end as notes,
    d as created_at
  from customer_pool c
  cross join lateral (
    select
      seq,
      (current_date - (10 + floor(random() * 30)::int)::int) + (seq * interval '2 hours') as d
    from generate_series(1, 1 + floor(random() * 4)::int) as seq
  ) gs
),
with_keys as (
  select
    customer_id,
    'ORD-' || date_key || '-' || lpad(row_number() over (partition by date_key order by created_at)::text, 4, '0') as number,
    amount, status, payment_method, notes, created_at
  from seed_orders
)
insert into public.orders
  (org_id, customer_id, number, amount, status, payment_method, notes, created_at)
select
  '11111111-1111-4111-8111-111111111111'::uuid,
  customer_id,
  number,
  amount,
  status,
  payment_method,
  notes,
  created_at
from with_keys
on conflict (org_id, number) do nothing;
