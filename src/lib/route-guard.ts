import "server-only";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { hasPermission, type PermissionKey } from "@/lib/permissions";

/**
 * 页面 → 所需权限。
 * 客户三个子菜单各自独立授权，路由与权限一一对应。
 */
export const PAGE_PERMISSIONS: Record<string, PermissionKey> = {
  "/dashboard": "dashboard.browse",
  "/dashboard/ecommerce": "dashboard.ecommerce.browse",
  "/customers": "customers.browse",
  "/customers/segments/high-value": "customers.high_value.browse",
  "/customers/segments/at-risk": "customers.at_risk.browse",
  "/orders": "orders.browse",
  "/organization": "members.browse",
};

/** 无权限时的兜底跳转：挑第一个当前用户可访问的页面，否则落到个人页 */
const FALLBACK_ORDER: Array<{ key: PermissionKey; route: string }> = [
  { key: "dashboard.browse", route: "/dashboard" },
  { key: "dashboard.ecommerce.browse", route: "/dashboard/ecommerce" },
  { key: "customers.browse", route: "/customers" },
  { key: "customers.high_value.browse", route: "/customers/segments/high-value" },
  { key: "customers.at_risk.browse", route: "/customers/segments/at-risk" },
  { key: "orders.browse", route: "/orders" },
  { key: "members.browse", route: "/organization" },
];

/** 当前用户可访问的第一个页面（能力全无时落到个人页） */
export function firstAccessibleRoute(
  permissions: readonly PermissionKey[],
): string {
  for (const { key, route } of FALLBACK_ORDER) {
    if (hasPermission(permissions, key)) return route;
  }
  return "/profile";
}

/**
 * 路由守卫：已登录但没有目标权限时，渲染专用的无权访问页，
 * 而不是静默跳到别的页面（未登录由 proxy 统一送去登录页）。
 */
export async function requirePermission(
  permissions: readonly PermissionKey[],
  key: PermissionKey,
): Promise<void> {
  if (!hasPermission(permissions, key)) {
    // 带上当前 locale，避免落到默认语言；/forbidden 仍在 (app) 布局内
    const locale = await getLocale();
    redirect(`/${locale}/forbidden`);
  }
}
