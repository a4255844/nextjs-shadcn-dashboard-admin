//   Notification Data
import { Calendar, Settings, Command, LayoutPanelLeft } from 'lucide-react';
import { Home, User, Ticket, Settings as SettingsIcon } from 'lucide-react';
import type { NotificationType, ProfileType } from "./types";

const Notification: NotificationType[] = [
  {
    icon: Calendar,
    bgcolor: "bg-chart-4/10",
    color: 'text-chart-4',
    title: "Event Today",
    subtitle: "Just a reminder that you have event",
    time: "9:15 AM",
    isRead: false,
  },
  {
    icon: Settings,
    bgcolor: "bg-chart-1/10",
    color: 'text-chart-1',
    title: "Settings",
    subtitle: "You can customize this template as you want",
    time: "4:36 PM",
    isRead: false,
  },
  {
    icon: LayoutPanelLeft,
    bgcolor: "bg-chart-2/10 ",
    color: 'text-chart-2',
    title: "Launch Admin",
    subtitle: "Just see the my new admin!",
    time: "9:30 AM",
    isRead: false,
  },
  {
    icon: Command,
    bgcolor: "bg-primary/5",
    color: 'text-primary',
    title: "Launch Admin",
    subtitle: "Just see the my new admin!",
    time: "9:30 AM",
    isRead: false,
  },
  {
    icon: Calendar,
    bgcolor: "bg-chart-5/10 ",
    color: 'text-chart-5',
    title: "Event Today",
    subtitle: "Just a reminder that you have event",
    time: "9:15 AM",
    isRead: false,
  },
  {
    icon: Settings,
    bgcolor: "bg-chart-1/10",
    color: 'text-chart-1',
    title: "Settings",
    subtitle: "You can customize this template as you want",
    time: "4:36 PM",
    isRead: true,
  },
];

const profileDD: ProfileType[] = [
  {
    avatar: Home,
    titleKey: 'home',
    href: '/',
  },
  {
    avatar: User,
    titleKey: 'profile',
    href: '/profile',
  },
  {
    avatar: Ticket,
    titleKey: 'tickets',
    href: '/tickets',
  },
  {
    avatar: SettingsIcon,
    titleKey: 'settings',
    href: '/settings',
  },
];

export {
  Notification,
  profileDD,
};
