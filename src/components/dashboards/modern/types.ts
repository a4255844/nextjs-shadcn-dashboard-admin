import type { LucideIcon } from "lucide-react";



// 销售图表数据点（单个日期的新增/老用户数）
export type SalesDataPoint = {
  date: string;
  newUser: number;
  existingUser: number;
};

// recharts tooltip payload 单项
export type TooltipItem = {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
  type?: string;
};

// chartConfig 单项
export type ConfigEntry = {
  label?: string;
  color?: string;
};

// AnimatedTooltipContent 组件 props
export type AnimatedTooltipContentProps = {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
  hideLabel?: boolean;
  config?: Record<string, ConfigEntry>;
};

// recent-orders 表格行
export type ProductRow = {
  id: string;
  project: string;
  productImg: string;
  name: string;
  role: string;
  timeline: string;
  budget: string;
  statustext: "On track" | "Delayed" | "Submitted";
};

// projects-orders 订单状态联合
export type StatusKey = "Processing" | "Delayed" | "Delivered" | "Cancelled";

// projects-orders 表格行
export type OrderRow = {
  id: string;
  project: string;
  avatar: string;
  name: string;
  role: string;
  status: StatusKey;
  price: string;
  deadline: string;
};

// totals-assets 资产卡片数据项
// id/title 即 dashboard.assets 下的 i18n key，二者保持一致
export type AssetKey = "employees" | "projects" | "clients" | "events";

export type AssetItem = {
  id: AssetKey;
  title: AssetKey;
  href: string;
  value: string;
  icon: LucideIcon;
};
