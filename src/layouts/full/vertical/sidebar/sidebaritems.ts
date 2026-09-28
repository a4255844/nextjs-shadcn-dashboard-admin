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
} from "lucide-react";
import type { ChildItem, MenuItem } from "./types";

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
