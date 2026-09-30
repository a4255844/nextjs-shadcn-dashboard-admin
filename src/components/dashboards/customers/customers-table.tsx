"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  flexRender,
  useTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  Search,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { features, useColumns } from "./columns";
import {
  PAGE_SIZE_OPTIONS,
  parsePageSize,
  parseSortableColumn,
  parseSortDir,
  parseStatus,
  type CustomerRow,
  type StatusKey,
} from "./types";

// 状态筛选值：all 表示全部，其余与 StatusKey 对齐
type StatusFilter = StatusKey | "all";

const STATUS_FILTER_OPTIONS: readonly StatusFilter[] = [
  "all",
  "active",
  "vip",
  "atRisk",
  "inactive",
] as const;

// 表格数据由服务端页面（RSC）从 DB 查询后传入
interface CustomersTableProps {
  rows: CustomerRow[];
}

export default function CustomersTable({ rows }: CustomersTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("customers.table");
  const columns = useColumns();

  // ---- 从 URL search params 派生表格状态（URL 是唯一状态源）----
  const q = searchParams.get("q") ?? "";
  const statusFilter: StatusFilter =
    parseStatus(searchParams.get("status")) ?? "all";
  const sortCol = parseSortableColumn(searchParams.get("sort"));
  const sortDir = parseSortDir(searchParams.get("order"));
  const pageStr = searchParams.get("page");
  const page = pageStr ? Math.max(1, Number(pageStr) || 1) : 1;
  const size = parsePageSize(searchParams.get("size")) ?? PAGE_SIZE_OPTIONS[0];

  // ---- 写回 URL 的辅助函数 ----
  // server-driven：URL 变化 -> RSC 重新渲染 -> 服务端重查 DB，
  // 每次交互都拿到数据库最新数据（多用户协同时不出现脏读）。
  // dev 下因国际延迟每次 ~600ms；生产环境（Vercel 与 Supabase 同区域）
  // 为几十 ms。数据量大后的演进方向：筛选/分页下推到 DB 查询，只回传一页。
  const setParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // ---- 搜索输入：local state + 防抖同步到 URL（每次提交都向服务端取最新数据）----
  const [inputQ, setInputQ] = useState(q);
  const firstRun = useRef(true);

  // URL 侧变化（清空、回退）回填输入框
  useEffect(() => {
    setInputQ(q);
  }, [q]);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setParams({ q: inputQ.trim() || null, page: null });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputQ]);

  // ---- 搜索 + 状态筛选：在数据层手动过滤（当前数据量，无需 react-table filter）----
  const filteredData = useMemo<CustomerRow[]>(() => {
    const term = q.toLowerCase().trim();
    return rows.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (
        term &&
        !(
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.company.toLowerCase().includes(term)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [rows, q, statusFilter]);

  // ---- react-table 状态：从 URL 派生，controlled ----
  const sorting: SortingState = useMemo(
    () =>
      sortCol && sortDir
        ? [{ id: sortCol, desc: sortDir === "desc" }]
        : [],
    [sortCol, sortDir],
  );

  const pagination: PaginationState = useMemo(
    () => ({ pageIndex: page - 1, pageSize: size }),
    [page, size],
  );

  // v9：feature 已在 columns 模块的 features 单例中注册（排序/分页 + 对应行模型），
  // core 行模型自动内置，无需再传 getCoreRowModel
  const table = useTable({
    features,
    data: filteredData,
    columns,
    state: { sorting, pagination },
    enableMultiSort: false,
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      setParams({
        sort: first ? first.id : null,
        order: first ? (first.desc ? "desc" : "asc") : null,
        page: null, // 排序变化重置到第 1 页
      });
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      setParams({
        page: String(next.pageIndex + 1),
        size: String(next.pageSize),
      });
    },
  });

  const pageCount = table.getPageCount();
  const totalRows = filteredData.length;
  const rangeFrom = totalRows === 0 ? 0 : page * size - size + 1;
  const rangeTo = Math.min(page * size, totalRows);
  const safeCurrent = Math.min(page, Math.max(pageCount, 1));

  const pageNumbers = useMemo(
    () => Array.from({ length: pageCount }, (_, i) => i + 1),
    [pageCount],
  );

  return (
    <DashboardCard className="flex flex-col">
      {/* 卡片头：搜索 + 状态筛选 + 行数 */}
      <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-64 w-full">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            placeholder={t("search")}
            className="ps-9"
            aria-label={t("search")}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setParams({
                status: v === "all" ? null : v,
                page: null,
              })
            }
          >
            <SelectTrigger size="sm" className="w-36" aria-label={t("filter.all")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? t("filter.all") : t(`status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(size)}
            onValueChange={(v) => setParams({ size: v, page: null })}
          >
            <SelectTrigger size="sm" className="w-28" aria-label={t("pagination.rowsPerPage")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / {t("pagination.rows")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 表格主体 */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((header) => (
                <TableHead key={header.id} className="h-11">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {t("pagination.noData")}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {/* v9：getVisibleCells 归 columnVisibilityFeature；未注册隐藏列能力时 getAllCells 等价 */}
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className="py-2">
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* 分页栏 */}
      <div className="flex flex-col gap-3 border-t border-border p-4 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-muted-foreground">
          {totalRows === 0
            ? t("pagination.showing", { from: 0, to: 0, total: 0 })
            : t("pagination.showing", {
                from: rangeFrom,
                to: rangeTo,
                total: totalRows,
              })}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label={t("pagination.first")}
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label={t("pagination.prev")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          {pageNumbers.map((n) => (
            <Button
              key={n}
              variant={n === safeCurrent ? "default" : "outline"}
              size="icon-sm"
              onClick={() => table.setPageIndex(n - 1)}
              aria-label={t("pagination.pageAria", { current: n, total: pageCount })}
              className="font-medium"
            >
              {n}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label={t("pagination.next")}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label={t("pagination.last")}
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </DashboardCard>
  );
}
