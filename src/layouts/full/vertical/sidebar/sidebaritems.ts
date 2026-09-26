import { uniqueId } from "lodash";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Gem,
  TrendingDown,
  Ticket,
  CircleUserRound,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface ChildItem {
  id?: number | string;
  name: string;
  icon?: LucideIcon;
  items?: ChildItem[];
  item?: unknown;
  url?: string;
  color?: string;
  disabled?: boolean;
  subtitle?: string;
  badge?: boolean;
  badgeType?: string;
  badgeContent?: string;
  isActive?: boolean;
  external?: boolean;
  isPro?: boolean;
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: LucideIcon;
  id?: number;
  to?: string;
  item?: MenuItem[];
  items?: ChildItem[];
  url?: string;
  disabled?: boolean;
  subtitle?: string;
  badgeType?: string;
  badge?: boolean;
  badgeContent?: string;
  isActive?: boolean;
  isPro?: boolean;
}

const SidebarContent: MenuItem[] = [
  {
    heading: "overview",
    items: [
      {
        id: uniqueId(),
        name: "dashboard",
        icon: LayoutDashboard,
        url: "/dashboard",
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
        items: [
          {
            id: uniqueId(),
            name: "allCustomers",
            icon: UsersRound,
            url: "/customers",
          },
          {
            id: uniqueId(),
            name: "highValue",
            icon: Gem,
            url: "/customers/segments/high-value",
          },
          {
            id: uniqueId(),
            name: "atRisk",
            icon: TrendingDown,
            url: "/customers/segments/at-risk",
          },
        ],
      },
      {
        id: uniqueId(),
        name: "tickets",
        icon: Ticket,
        url: "/tickets",
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

export default SidebarContent;
