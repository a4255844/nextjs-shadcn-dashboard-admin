-- 0003: seed 数据
-- 1 个演示组织 + 15 条 customers（与原前端 mock 对齐）
-- 幂等：重复执行不产生重复行

insert into public.organizations (id, name)
values ('11111111-1111-4111-8111-111111111111', 'Demo Workspace')
on conflict (id) do nothing;

insert into public.customers
  (org_id, name, email, company, status, spent, created_at, avatar_color)
values
  ('11111111-1111-4111-8111-111111111111', 'Eleanor Pena',  'eleanor.pena@acme.io',          'Acme Corporation',  'vip',      28430, '2024-03-12', 'bg-chart-2/20'),
  ('11111111-1111-4111-8111-111111111111', 'Hiroshi Tanaka','h.tanaka@orbital.dev',          'Orbital Labs',      'active',   15200, '2024-05-22', 'bg-chart-1/20'),
  ('11111111-1111-4111-8111-111111111111', 'Amara Okafor',  'amara@northwind.co',            'Northwind Traders', 'atRisk',     840, '2025-01-03', 'bg-destructive/20'),
  ('11111111-1111-4111-8111-111111111111', 'Liam Chen',     'liam.chen@brightline.app',      'Brightline',        'active',   12380, '2024-07-18', 'bg-chart-3/20'),
  ('11111111-1111-4111-8111-111111111111', 'Sofia Rossi',   'sofia@monteverde.studio',       'Monteverde Studio', 'inactive',     0, '2023-11-09', 'bg-muted'),
  ('11111111-1111-4111-8111-111111111111', 'Moses Adeyemi', 'moses@paystack.merge',          'Paystack Merge',    'vip',      42100, '2023-08-14', 'bg-chart-2/20'),
  ('11111111-1111-4111-8111-111111111111', 'Yuki Saito',    'yuki.saito@kaze.jp',            'Kaze Holdings',     'active',    9650, '2025-02-27', 'bg-chart-1/20'),
  ('11111111-1111-4111-8111-111111111111', 'Noah Williams', 'noah.w@summitpeak.io',          'Summit Peak',       'atRisk',    1320, '2024-09-30', 'bg-destructive/20'),
  ('11111111-1111-4111-8111-111111111111', 'Priya Nair',    'priya.nair@lumina.in',          'Lumina Systems',    'active',   18750, '2024-04-05', 'bg-chart-3/20'),
  ('11111111-1111-4111-8111-111111111111', 'Mateo García',  'mateo@andalus.es',              'Andalus Media',     'vip',      35600, '2023-06-21', 'bg-chart-2/20'),
  ('11111111-1111-4111-8111-111111111111', 'Chloé Dubois',  'chloe@parisienne.fr',           'Parisienne Co.',    'inactive',     0, '2023-12-15', 'bg-muted'),
  ('11111111-1111-4111-8111-111111111111', 'Daniel Kim',    'd.kim@hanbridge.kr',            'Hanbridge',         'active',    7420, '2025-03-08', 'bg-chart-1/20'),
  ('11111111-1111-4111-8111-111111111111', 'Aisha Hassan',  'aisha@deltaforge.ae',           'Deltaforge',        'atRisk',    2150, '2024-10-19', 'bg-destructive/20'),
  ('11111111-1111-4111-8111-111111111111', 'Lucas Müller',  'lucas@nordstrom.de',            'Nordstrom GmbH',    'vip',      51200, '2023-09-02', 'bg-chart-2/20'),
  ('11111111-1111-4111-8111-111111111111', 'Ingrid Larsen', 'ingrid@nordlys.no',             'Nordlys AS',        'active',    4380, '2025-04-11', 'bg-chart-3/20')
on conflict (org_id, email) do nothing;
