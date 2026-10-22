// 订单状态：稳定 key，展示时由 i18n 翻译
export type OrderStatus = "pending" | "paid" | "refunded" | "cancelled";

export const ORDER_STATUS_KEYS: readonly OrderStatus[] = [
  "pending",
  "paid",
  "refunded",
  "cancelled",
] as const;

export function parseOrderStatus(v: string | null | undefined): OrderStatus | null {
  if (typeof v !== "string") return null;
  return (ORDER_STATUS_KEYS as readonly string[]).includes(v)
    ? (v as OrderStatus)
    : null;
}

// 排序方向（复用 customers 的 parseSortDir）
export type SortDir = "asc" | "desc";

export type SortableColumnId =
  | "number"
  | "customerName"
  | "amount"
  | "status"
  | "createdAt";

export function parseSortableColumn(
  v: string | null | undefined,
): SortableColumnId | null {
  const allowed: readonly SortableColumnId[] = [
    "number",
    "customerName",
    "amount",
    "status",
    "createdAt",
  ];
  if (typeof v !== "string") return null;
  return (allowed as readonly string[]).includes(v)
    ? (v as SortableColumnId)
    : null;
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export function parsePageSize(v: string | null | undefined): PageSize | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
    ? (n as PageSize)
    : null;
}

export function parseSortDir(v: string | null | undefined): SortDir | null {
  if (v === "asc" || v === "desc") return v;
  return null;
}

export interface OrderRow {
  id: string;
  orgId: string;
  customerId: string;
  customerName: string;
  number: string;
  amount: number;
  status: OrderStatus;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
}
