import { uniqueId } from "lodash";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  UsersRound,
  Gem,
  TrendingDown,
  Receipt,
  Building2,
  CircleUserRound,
  Settings,
} from "lucide-react";
import type { ChildItem, MenuItem } from "./types";
import type { PermissionKey } from "@/lib/permissions";

const SidebarContent: MenuItem[] = [
  {
    heading: "overview",
    items: [
      {
        id: uniqueId(),
        name: "dashboard",
        icon: LayoutDashboard,
        url: "/dashboard",
        permission: "dashboard.browse",
      },
      {
        id: uniqueId(),
        name: "ecommerce",
        icon: ShoppingBag,
        url: "/dashboard/ecommerce",
        permission: "dashboard.ecommerce.browse",
      },
    ],
  },
  {
    heading: "management",
    items: [
      {
        id: uniqueId(),
        name: "customers",
        icon: Users,
        // 父级只是分组：任一子菜单有权限即显示，具体子项各自独立过滤
        items: [
          {
            id: uniqueId(),
            name: "allCustomers",
            icon: UsersRound,
            url: "/customers",
            permission: "customers.browse",
          },
          {
            id: uniqueId(),
            name: "highValue",
            icon: Gem,
            url: "/customers/segments/high-value",
            permission: "customers.high_value.browse",
          },
          {
            id: uniqueId(),
            name: "atRisk",
            icon: TrendingDown,
            url: "/customers/segments/at-risk",
            permission: "customers.at_risk.browse",
          },
        ],
      },
      {
        id: uniqueId(),
        name: "orders",
        icon: Receipt,
        url: "/orders",
        permission: "orders.browse",
      },
      {
        id: uniqueId(),
        name: "organization",
        icon: Building2,
        url: "/organization",
        permission: "members.browse",
      },
    ],
  },
  {
    heading: "account",
    items: [
      {
        id: uniqueId(),
        name: "profile",
        icon: CircleUserRound,
        url: "/profile",
      },
      {
        id: uniqueId(),
        name: "settings",
        icon: Settings,
        url: "/settings",
      },
    ],
  },
];

/**
 * 按当前组织权限过滤菜单。
 * 无权限的分组/子项整体隐藏；过滤后没有任何子项的分组也一并移除。
 * `permissions` 为 undefined 表示"尚未取到组织/权限"——此时不过滤，
 * 避免首屏闪一下空菜单（服务端页面守卫仍会拦截实际内容）。
 */
export function filterSidebarItems(
  permissions: readonly PermissionKey[] | undefined,
): MenuItem[] {
  if (permissions === undefined) return SidebarContent;

  const allowed = (permission: PermissionKey | undefined): boolean =>
    permission === undefined || permissions.includes(permission);

  return SidebarContent.flatMap((section) => {
    if (section.items === undefined) return [section];

    const items = section.items.flatMap((item: ChildItem) => {
      if (!allowed(item.permission)) return [];
      if (item.items === undefined) return [item];

      const children = item.items.filter((sub) => allowed(sub.permission));
      // 父级入口本身无权限或子项全被过滤 → 整个分组隐藏
      return children.length === 0 ? [] : [{ ...item, items: children }];
    });

    return items.length === 0 ? [] : [{ ...section, items }];
  });
}

export default SidebarContent;
