import type { LucideIcon } from "lucide-react";
import type { StatusKey } from "@/components/dashboards/customers/types";
import type { OrderStatus } from "@/components/dashboards/orders/types";

// 仪表盘时间区间：月度 = 本自然月 vs 上月；年度 = 本年 vs 去年
export type DashboardRange = "month" | "year";

export function parseDashboardRange(
  v: string | null | undefined,
): DashboardRange | null {
  return v === "month" || v === "year" ? v : null;
}

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
  /** 金额格式化用的当前语言环境 */
  locale?: string;
};

// 销售图表单日数据点：按天聚合的已支付 / 待支付金额
export type SalesPoint = {
  /** 本地日期 YYYY-MM-DD，展示时按 locale 格式化 */
  date: string;
  paid: number;
  unpaid: number;
};

// 单个周期（7/30/90 天）的序列 + 总计 + 上一等长周期总计（用于涨跌）
export type SalesSeries = {
  points: SalesPoint[];
  total: number;
  previousTotal: number;
};

export type SalesPeriodKey = "d7" | "d30" | "d90";

export type SalesSeriesMap = Record<SalesPeriodKey, SalesSeries>;

// 最近订单（仪表盘汇总表）
export type RecentOrder = {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: OrderStatus;
  createdAt: string;
};

// recent-orders 表格行（模板遗留组件使用）
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

// 客户分群卡片：id/title 即 dashboard.assets.items 下的 i18n key
export type AssetItem = {
  id: StatusKey;
  href: string;
  value: number;
  icon: LucideIcon;
};
