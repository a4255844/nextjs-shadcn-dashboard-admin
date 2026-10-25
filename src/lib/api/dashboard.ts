import "server-only";

import { getAllCustomers } from "@/lib/api/customers";
import { getAllOrders } from "@/lib/api/orders";
import { STATUS_KEYS } from "@/components/dashboards/customers/types";
import type { StatusKey } from "@/components/dashboards/customers/types";
import type {
  DashboardRange,
  RecentOrder,
  SalesPeriodKey,
  SalesPoint,
  SalesSeries,
} from "@/components/dashboards/modern/types";

// 单个指标：当前区间值 + 上一等长区间值（页面据此算涨跌）
export type MetricDelta = {
  current: number;
  previous: number;
};

export type DashboardData = {
  revenue: MetricDelta;
  newCustomers: MetricDelta;
  orderCount: MetricDelta;
  /** 全量待处理订单数（不受区间限制） */
  pendingOrders: number;
  statusCounts: Record<StatusKey, number>;
  sales: Record<SalesPeriodKey, SalesSeries>;
  recentOrders: RecentOrder[];
};

const SALES_DAYS: Record<SalesPeriodKey, number> = {
  d7: 7,
  d30: 30,
  d90: 90,
};

const RECENT_ORDER_LIMIT = 6;

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// 本地日期键 YYYY-MM-DD：与列展示、CSV 导出同用服务器时区
function dayKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

type Interval = {
  start: Date;
  end: Date;
};

// 区间窗口：current = 本期至今，previous = 上一等长周期
function rangeWindows(
  range: DashboardRange,
  now: Date,
): { current: Interval; previous: Interval } {
  if (range === "month") {
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      current: { start: currentStart, end: now },
      previous: { start: previousStart, end: currentStart },
    };
  }
  const currentStart = new Date(now.getFullYear(), 0, 1);
  const previousStart = new Date(now.getFullYear() - 1, 0, 1);
  return {
    current: { start: currentStart, end: now },
    previous: { start: previousStart, end: currentStart },
  };
}

function inInterval(iso: string, interval: Interval): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= interval.start.getTime() && t < interval.end.getTime();
}

// 按天分桶统计收入：paid 计入已实现收入，pending 计入待收金额。
// refunded / cancelled 不计入任何一条曲线，避免虚增销售额。
function buildSeries(
  orders: Awaited<ReturnType<typeof getAllOrders>>,
  days: number,
  now: Date,
): SalesSeries {
  const end = addDays(startOfDay(now), 1);
  const start = addDays(end, -days);
  const previousStart = addDays(start, -days);

  const buckets = new Map<string, SalesPoint>();
  for (let i = 0; i < days; i += 1) {
    const key = dayKey(addDays(start, i));
    buckets.set(key, { date: key, paid: 0, unpaid: 0 });
  }

  let total = 0;
  let previousTotal = 0;

  for (const order of orders) {
    if (order.status !== "paid" && order.status !== "pending") continue;
    const created = new Date(order.createdAt);
    if (Number.isNaN(created.getTime())) continue;

    if (created >= start && created < end) {
      const bucket = buckets.get(dayKey(created));
      if (bucket === undefined) continue;
      if (order.status === "paid") {
        bucket.paid += order.amount;
        total += order.amount;
      } else {
        bucket.unpaid += order.amount;
      }
      continue;
    }

    // 上一等长周期只用于算涨跌，不画进图
    if (order.status === "paid" && created >= previousStart && created < start) {
      previousTotal += order.amount;
    }
  }

  return { points: [...buckets.values()], total, previousTotal };
}

/**
 * 仪表盘数据：一次拉全量客户与订单后在应用层聚合。
 * 复用 getAllCustomers / getAllOrders 的分页拉取，避免 PostgREST 1000 行上限
 * 导致统计值偏小。
 */
export async function getDashboardData(
  orgId: string,
  range: DashboardRange,
): Promise<DashboardData> {
  const [customers, orders] = await Promise.all([
    getAllCustomers(orgId, null, null),
    getAllOrders(orgId, null),
  ]);

  const now = new Date();
  const { current, previous } = rangeWindows(range, now);

  const statusCounts = Object.fromEntries(
    STATUS_KEYS.map((key) => [key, 0]),
  ) as Record<StatusKey, number>;
  let newCustomersCurrent = 0;
  let newCustomersPrevious = 0;

  for (const customer of customers) {
    statusCounts[customer.status] += 1;
    if (inInterval(customer.createdAt, current)) newCustomersCurrent += 1;
    else if (inInterval(customer.createdAt, previous)) newCustomersPrevious += 1;
  }

  let revenueCurrent = 0;
  let revenuePrevious = 0;
  let ordersCurrent = 0;
  let ordersPrevious = 0;
  let pendingOrders = 0;

  for (const order of orders) {
    if (order.status === "pending") pendingOrders += 1;
    if (order.status === "paid") {
      if (inInterval(order.createdAt, current)) revenueCurrent += order.amount;
      else if (inInterval(order.createdAt, previous)) revenuePrevious += order.amount;
    }
    if (inInterval(order.createdAt, current)) ordersCurrent += 1;
    else if (inInterval(order.createdAt, previous)) ordersPrevious += 1;
  }

  const sales = Object.fromEntries(
    (Object.keys(SALES_DAYS) as SalesPeriodKey[]).map((key) => [
      key,
      buildSeries(orders, SALES_DAYS[key], now),
    ]),
  ) as Record<SalesPeriodKey, SalesSeries>;

  const recentOrders: RecentOrder[] = orders
    .slice(0, RECENT_ORDER_LIMIT)
    .map((order) => ({
      id: order.id,
      number: order.number,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      amount: order.amount,
      status: order.status,
      createdAt: order.createdAt,
    }));

  return {
    revenue: { current: revenueCurrent, previous: revenuePrevious },
    newCustomers: { current: newCustomersCurrent, previous: newCustomersPrevious },
    orderCount: { current: ordersCurrent, previous: ordersPrevious },
    pendingOrders,
    statusCounts,
    sales,
    recentOrders,
  };
}
