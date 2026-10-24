"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  flexRender,
  useTable,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Loader2,
  Download,
  Upload,
  Trash2,
} from "lucide-react";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import CustomerFormDialog from "./customer-form-dialog";
import CustomerDeleteDialog from "./customer-delete-dialog";
import ImportDialog from "@/components/shared/import-dialog";
import BatchDeleteDialog from "@/components/shared/batch-delete-dialog";
import { removeCustomers } from "@/lib/actions/customers";
import { importCustomersCsv } from "@/lib/actions/imports";
import { csvTimestamp } from "@/lib/csv";
import { toast } from "sonner";

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
  orgId: string;
  /** 当前用户在激活组织内是否为 admin（member 整表只读，RLS 为最终兜底） */
  isAdmin: boolean;
}

export default function CustomersTable({ rows, orgId, isAdmin }: CustomersTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("customers.table");
  const tp = useTranslations("customers");

  // ---- 写操作弹窗状态 ----
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);

  const handleEdit = useCallback((c: CustomerRow) => {
    setEditingCustomer(c);
    setFormOpen(true);
  }, []);
  const handleDelete = useCallback((c: CustomerRow) => {
    setDeleteTarget(c);
  }, []);
  const handleAdd = () => {
    setEditingCustomer(null);
    setFormOpen(true);
  };

  // ---- 从 URL search params 派生表格状态（URL 是唯一状态源）----
  const q = searchParams.get("q") ?? "";
  const statusFilter: StatusFilter =
    parseStatus(searchParams.get("status")) ?? "all";

  // ---- CSV 导出 / 导入 ----
  const [importOpen, setImportOpen] = useState(false);

  // ---- 行勾选：key 为行 id（getRowId），跨分页/筛选保留 ----
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const selectedCount = Object.keys(rowSelection).length;

  // ---- 批量删除 ----
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const doExport = useCallback(
    (exportAll: boolean) => {
      // 直接通过 <a href> 触发浏览器原生下载，零 JS 请求，零加载状态
      const params = new URLSearchParams({ orgId });
      if (!exportAll) {
        const ids = Object.keys(rowSelection);
        if (ids.length === 0) {
          toast.error(tp("toasts.exportFailed"));
          return;
        }
        params.set("mode", "selected");
        params.set("ids", ids.join(","));
      }
      const a = document.createElement("a");
      a.href = `/api/export/customers?${params.toString()}`;
      a.download = `customers-${csvTimestamp()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success(
        exportAll
          ? tp("toasts.exportedAll", { count: rows.length })
          : tp("toasts.exportedSelected", { count: Object.keys(rowSelection).length }),
      );
    },
    [orgId, rows.length, rowSelection, tp],
  );

  const columns = useColumns({ isAdmin, onEdit: handleEdit, onDelete: handleDelete });
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
  //
  // useTransition：把 router.replace 标记为过渡更新，isPending 覆盖
  // RSC 取数全过程，驱动表格区的 loading 遮罩。
  const [isPending, startTransition] = useTransition();
  const setParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    // 没有实际变化就不导航：首屏时服务端已按当前 URL 渲染数据，
    // 此时若再 replace 一次（StrictMode 双执行 effect、表格内部 no-op 回调等
    // 都会触发），会白白再发一次 RSC 请求
    if (qs === searchParams.toString()) return;
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
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
    }, 500);
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
    state: { sorting, pagination, rowSelection },
    getRowId: (row) => row.id,
    enableMultiSort: false,
    // 分页由 URL 控制：data 引用每次 RSC 重查都会变，
    // 默认的 autoResetPageIndex 会把页码重置回 1，必须禁用
    autoResetPageIndex: false,
    onRowSelectionChange: setRowSelection,
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
      // 无变化不写 URL（v9 会在挂载/数据变更时以 no-op 触发本回调）
      if (
        next.pageIndex === pagination.pageIndex &&
        next.pageSize === pagination.pageSize
      ) {
        return;
      }
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

  // 删除最后一页最后一条等场景：RSC 刷新后总页数收缩，URL 中的 page 越界，
  // 自动回退到最后一页
  useEffect(() => {
    if (page > pageCount) {
      setParams({ page: String(Math.max(pageCount, 1)) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageCount]);

  const pageNumbers = useMemo(
    () => Array.from({ length: pageCount }, (_, i) => i + 1),
    [pageCount],
  );

  return (
    <>
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
          {isAdmin && (
            <Button size="sm" onClick={handleAdd}>
              <Plus className="size-4" />
              {t("actions.add")}
            </Button>
          )}
          {isAdmin && selectedCount > 0 && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 cursor-pointer"
              onClick={() => setBatchDeleteOpen(true)}
            >
              <Trash2 className="size-3.5" />
              {t("actions.deleteSelected", { count: selectedCount })}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 cursor-pointer"
                aria-label={t("export.label")}
              >
                <Download className="size-3.5" />
                {t("export.label")}
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={selectedCount === 0}
                onClick={() => doExport(false)}
              >
                {t("export.selected", { count: selectedCount })}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => doExport(true)}
              >
                {t("export.all")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 cursor-pointer"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="size-3.5" />
              {t("import.label")}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 px-2 font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={t("filter.all")}
              >
                {statusFilter === "all"
                  ? t("filter.all")
                  : t(`status.${statusFilter}`)}
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-36">
              <DropdownMenuRadioGroup
                value={statusFilter}
                onValueChange={(v) => {
                  // Radix 落定纪律：关闭动画期间同步 router.replace 会打断关闭流程
                  // 导致菜单弹回（与 LocaleSwitch 的 50ms 延迟导航同理）
                  window.setTimeout(
                    () => setParams({ status: v === "all" ? null : v, page: null }),
                    50,
                  );
                }}
              >
                {STATUS_FILTER_OPTIONS.map((s) => (
                  <DropdownMenuRadioItem
                    key={s}
                    value={s}
                    className="cursor-pointer"
                  >
                    {s === "all" ? t("filter.all") : t(`status.${s}`)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 表格主体：请求中（transition 取数）叠加半透明遮罩 + spinner */}
      <div className="relative" aria-busy={isPending}>
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
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
              >
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
        {isPending && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/60"
            aria-hidden="true"
          >
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

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
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 px-2 font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={t("pagination.rowsPerPage")}
              >
                {size} / {t("pagination.rows")}
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-36">
              <DropdownMenuRadioGroup
                value={String(size)}
                onValueChange={(v) => {
                  // Radix 落定纪律：延迟到菜单关闭落定后再写 URL（同状态筛选）
                  window.setTimeout(() => setParams({ size: v, page: null }), 50);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <DropdownMenuRadioItem
                    key={n}
                    value={String(n)}
                    className="cursor-pointer"
                  >
                    {n} / {t("pagination.rows")}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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
      </div>
      </DashboardCard>

      {isAdmin && (
        <>
          <CustomerFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            orgId={orgId}
            customer={editingCustomer}
          />
          <CustomerDeleteDialog
            orgId={orgId}
            target={deleteTarget}
            onClose={() => setDeleteTarget(null)}
          />
          <ImportDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            orgId={orgId}
            columnLabels={["Name", "Email", "Company", "Status", "Spent"]}
            actionFn={importCustomersCsv}
            tNamespace="customers.import"
          />
          <BatchDeleteDialog
            open={batchDeleteOpen}
            onOpenChange={setBatchDeleteOpen}
            count={selectedCount}
            ids={Object.keys(rowSelection)}
            orgId={orgId}
            actionFn={removeCustomers}
            tNamespace="customers"
            note={t("batchDelete.note")}
            onDeleted={() => setRowSelection({})}
          />
        </>
      )}
    </>
  );
}
