/**
 * 权限目录（单一真源）。
 * 与 supabase/migrations 中 permissions 表的 key 一一对应；
 * 新增权限必须同时改这两处（迁移里 key 是主键，写错会被 FK 拒绝）。
 */

export const PERMISSION_KEYS = [
  "dashboard.browse",
  "dashboard.ecommerce.browse",
  // 全部客户（/customers）
  "customers.browse",
  "customers.create",
  "customers.update",
  "customers.delete",
  "customers.export",
  "customers.import",
  // 高价值客户（/customers/segments/high-value）
  "customers.high_value.browse",
  "customers.high_value.update",
  "customers.high_value.delete",
  "customers.high_value.export",
  // 流失风险客户（/customers/segments/at-risk）
  "customers.at_risk.browse",
  "customers.at_risk.update",
  "customers.at_risk.delete",
  "customers.at_risk.export",
  "orders.browse",
  "orders.create",
  "orders.update",
  "orders.delete",
  "orders.export",
  "orders.import",
  "members.browse",
  "members.invite",
  "members.manage",
  "org.update",
  "org.delete",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type PermissionMap = Record<PermissionKey, boolean>;

// ---- 客户菜单的作用域 ----
// 三个子菜单各自独立授权：全部客户、高价值客户、流失风险客户。
// 分群页隐藏「新建/导入」，因此这两个动作只在 all 作用域存在。
export type CustomerScope = "all" | "high_value" | "at_risk";

interface CustomerScopeKeys {
  browse: PermissionKey;
  create?: PermissionKey;
  update: PermissionKey;
  delete: PermissionKey;
  export: PermissionKey;
  import?: PermissionKey;
}

export const CUSTOMER_SCOPE_KEYS: Record<CustomerScope, CustomerScopeKeys> = {
  all: {
    browse: "customers.browse",
    create: "customers.create",
    update: "customers.update",
    delete: "customers.delete",
    export: "customers.export",
    import: "customers.import",
  },
  high_value: {
    browse: "customers.high_value.browse",
    update: "customers.high_value.update",
    delete: "customers.high_value.delete",
    export: "customers.high_value.export",
  },
  at_risk: {
    browse: "customers.at_risk.browse",
    update: "customers.at_risk.update",
    delete: "customers.at_risk.delete",
    export: "customers.at_risk.export",
  },
};

/** 信任边界：URL 参数收窄为作用域；未知值按权限最严的 all 处理 */
export function parseCustomerScope(v: string | null | undefined): CustomerScope {
  return v === "high_value" || v === "at_risk" ? v : "all";
}

// ---- 权限树结构：菜单权限 + 归属该菜单的按钮权限 ----

/** 菜单权限节点：对应侧边栏里的一个入口，按钮权限挂在它下面 */
export interface MenuPermission {
  key: PermissionKey;
  /** sidebar.menu.<menuKey>，与侧边栏共用同一套文案 */
  menuKey: string;
  /** 该入口对应的路由（展示用） */
  route: string;
  /** 该菜单下可单独授权的按钮/操作 */
  actions: readonly PermissionKey[];
}

/** 一个模块的权限：若干菜单，外加无法归属到菜单的模块级操作 */
export interface PermissionGroup {
  module: string;
  menus: readonly MenuPermission[];
  actions: readonly PermissionKey[];
}

/** 权限树的分组结构（与侧边栏 menu 一一对应） */
export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    module: "dashboard",
    menus: [
      { key: "dashboard.browse", menuKey: "dashboard", route: "/dashboard", actions: [] },
      {
        key: "dashboard.ecommerce.browse",
        menuKey: "ecommerce",
        route: "/dashboard/ecommerce",
        actions: [],
      },
    ],
    actions: [],
  },
  {
    module: "customers",
    menus: [
      {
        key: "customers.browse",
        menuKey: "allCustomers",
        route: "/customers",
        actions: [
          "customers.create",
          "customers.update",
          "customers.delete",
          "customers.export",
          "customers.import",
        ],
      },
      {
        key: "customers.high_value.browse",
        menuKey: "highValue",
        route: "/customers/segments/high-value",
        actions: [
          "customers.high_value.update",
          "customers.high_value.delete",
          "customers.high_value.export",
        ],
      },
      {
        key: "customers.at_risk.browse",
        menuKey: "atRisk",
        route: "/customers/segments/at-risk",
        actions: [
          "customers.at_risk.update",
          "customers.at_risk.delete",
          "customers.at_risk.export",
        ],
      },
    ],
    actions: [],
  },
  {
    module: "orders",
    menus: [
      {
        key: "orders.browse",
        menuKey: "orders",
        route: "/orders",
        actions: [
          "orders.create",
          "orders.update",
          "orders.delete",
          "orders.export",
          "orders.import",
        ],
      },
    ],
    actions: [],
  },
  {
    module: "members",
    menus: [
      {
        key: "members.browse",
        menuKey: "organization",
        route: "/organization",
        actions: ["members.invite", "members.manage"],
      },
    ],
    actions: [],
  },
  {
    module: "org",
    menus: [],
    actions: ["org.update", "org.delete"],
  },
];

/** 组内全部权限 key（菜单 + 各菜单下的按钮 + 模块级操作），用于模块级全选与计数 */
export function groupPermissionKeys(group: PermissionGroup): PermissionKey[] {
  return [
    ...group.menus.flatMap((menu) => [menu.key, ...menu.actions]),
    ...group.actions,
  ];
}

/** 信任边界：DB / RPC 返回的字符串收窄为目录内的 key */
export function parsePermissionKey(v: string): PermissionKey | null {
  return (PERMISSION_KEYS as readonly string[]).includes(v)
    ? (v as PermissionKey)
    : null;
}

/** 过滤未知 key（DB 已按 FK 约束，这里防的是版本漂移） */
export function parsePermissionKeys(
  values: readonly string[] | null | undefined,
): PermissionKey[] {
  return (values ?? []).flatMap((v) => {
    const key = parsePermissionKey(v);
    return key === null ? [] : [key];
  });
}

export function toPermissionMap(keys: readonly PermissionKey[]): PermissionMap {
  const map = Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, false]),
  ) as PermissionMap;
  for (const key of keys) map[key] = true;
  return map;
}

export function can(map: PermissionMap, key: PermissionKey): boolean {
  return map[key];
}

/** 权限集合（RSC 从 OrgSummary 拿到）是否包含某项 */
export function hasPermission(
  keys: readonly PermissionKey[],
  key: PermissionKey,
): boolean {
  return keys.includes(key);
}
