// 客户状态：稳定 key，展示时由 i18n 翻译
export type StatusKey = "active" | "inactive" | "vip" | "atRisk";

export const STATUS_KEYS: readonly StatusKey[] = [
  "active",
  "inactive",
  "vip",
  "atRisk",
] as const;

// 信任边界校验：从 URL search param / localStorage 等读入的字符串
// 必须先经此函数校验通过后才允许 as 收窄
export function parseStatus(v: string | null | undefined): StatusKey | null {
  if (typeof v !== "string") return null;
  return (STATUS_KEYS as readonly string[]).includes(v) ? (v as StatusKey) : null;
}

// 排序方向：react-table 的 SortingState 用 "asc" | "desc"
// URL 里只存这两个值，无排序时 URL 无 sort 参数
export type SortDir = "asc" | "desc";

export function parseSortDir(v: string | null | undefined): SortDir | null {
  if (v === "asc" || v === "desc") return v;
  return null;
}

// 可排序的列 id（与 columns.tsx 中的 accessorKey 对齐）
export type SortableColumnId =
  | "name"
  | "company"
  | "status"
  | "spent"
  | "createdAt";

export function parseSortableColumn(
  v: string | null | undefined,
): SortableColumnId | null {
  const allowed: readonly SortableColumnId[] = [
    "name",
    "company",
    "status",
    "spent",
    "createdAt",
  ];
  if (typeof v !== "string") return null;
  return (allowed as readonly string[]).includes(v)
    ? (v as SortableColumnId)
    : null;
}

// 每页行数可选项
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export function parsePageSize(v: string | null | undefined): PageSize | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
    ? (n as PageSize)
    : null;
}

// 单条客户记录：mock 数据结构
export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  company: string;
  status: StatusKey;
  spent: number;
  createdAt: string; // ISO 日期，展示时 format
  avatarColor: string; // 头像背景色（首字母 fallback 用）
}
