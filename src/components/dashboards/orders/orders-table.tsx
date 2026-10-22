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
} from "lucide-react";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
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
  ORDER_STATUS_KEYS,
  PAGE_SIZE_OPTIONS,
  parsePageSize,
  parseSortableColumn,
  parseSortDir,
  parseOrderStatus,
  type OrderRow,
  type OrderStatus,
} from "./types";
import OrderFormDialog from "./order-form-dialog";
import OrderDeleteDialog from "./order-delete-dialog";

type StatusFilter = OrderStatus | "all";

const STATUS_FILTER_OPTIONS: readonly StatusFilter[] = [
  "all",
  ...ORDER_STATUS_KEYS,
] as const;

interface OrdersTableProps {
  rows: OrderRow[];
  orgId: string;
  isAdmin: boolean;
  /** 当前组织的客户列表（供弹窗 Select 使用） */
  customers: { id: string; name: string }[];
}

export default function OrdersTable({
  rows,
  orgId,
  isAdmin,
  customers,
}: OrdersTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("pages.orders.table");

  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrderRow | null>(null);

  const handleEdit = useCallback((o: OrderRow) => {
    setEditingOrder(o);
    setFormOpen(true);
  }, []);
  const handleDelete = useCallback((o: OrderRow) => {
    setDeleteTarget(o);
  }, []);
  const handleAdd = () => {
    setEditingOrder(null);
    setFormOpen(true);
  };

  const columns = useColumns({ isAdmin, onEdit: handleEdit, onDelete: handleDelete });

  const q = searchParams.get("q") ?? "";
  const statusFilter: StatusFilter =
    parseOrderStatus(searchParams.get("status")) ?? "all";
  const sortCol = parseSortableColumn(searchParams.get("sort"));
  const sortDir = parseSortDir(searchParams.get("order"));
  const pageStr = searchParams.get("page");
  const page = pageStr ? Math.max(1, Number(pageStr) || 1) : 1;
  const size = parsePageSize(searchParams.get("size")) ?? PAGE_SIZE_OPTIONS[0];

  const [isPending, startTransition] = useTransition();
  const setParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const [inputQ, setInputQ] = useState(q);
  const firstRun = useRef(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL 是输入框的真相来源，回填是同步状态
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

  const filteredData = useMemo<OrderRow[]>(() => {
    const term = q.toLowerCase().trim();
    return rows.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (
        term &&
        !(
          o.number.toLowerCase().includes(term) ||
          o.customerName.toLowerCase().includes(term) ||
          (o.paymentMethod?.toLowerCase().includes(term) ?? false)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [rows, q, statusFilter]);

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
        page: null,
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
                  <TableRow key={row.id}>
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
          <OrderFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            orgId={orgId}
            order={editingOrder}
            customers={customers}
          />
          <OrderDeleteDialog
            orgId={orgId}
            target={deleteTarget}
            onClose={() => setDeleteTarget(null)}
          />
        </>
      )}
    </>
  );
}
