import type { LucideIcon } from "lucide-react";

// 顶部通知项
export interface NotificationType {
  title: string;
  icon: LucideIcon;
  subtitle: string;
  bgcolor: string;
  color: string;
  time: string;
  isRead?: boolean;
}

// 用户头像下拉菜单项
export interface ProfileType {
  avatar: LucideIcon;
  titleKey: string;
  href: string;
}

// 全局搜索结果项
export interface SearchResult {
  key: string;
  label: string;
  url: string;
  external?: boolean;
}
