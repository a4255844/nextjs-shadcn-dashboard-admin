"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  type ColumnDef,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "cn";
import type { CustomerRow, StatusKey } from "./types";

// TanStack Table v9：按需显式注册 feature（v8 是全量内置）。
// 模块级单例，columns 类型与 useTable 共用同一份 features，保证 TFeatures 推断一致。
export const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

// 状态徽章配色：与 stat-card 的 badge 体系协调
const statusBadgeClass: Record<StatusKey, string> = {
  active: "bg-chart-2/10 text-chart-2",
  vip: "bg-primary/10 text-primary",
  inactive: "bg-muted text-muted-foreground",
  atRisk: "bg-destructive/10 text-destructive",
};

// 取姓名首字母作为头像 fallback（最多 2 个）
function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .filter((ch): ch is string => ch !== undefined && ch !== "")
      .slice(0, 2)
      .join("")
      .toUpperCase()
  );
}

// 列定义 hook 入参：admin 才注入行操作回调（member 无操作列）
interface UseColumnsOptions {
  isAdmin: boolean;
  onEdit: (customer: CustomerRow) => void;
  onDelete: (customer: CustomerRow) => void;
}

// 列定义 hook：i18n + locale 感知，返回 memoized 的 ColumnDef 数组
export function useColumns({
  isAdmin,
  onEdit,
  onDelete,
}: UseColumnsOptions): ColumnDef<typeof features, CustomerRow>[] {
  const t = useTranslations("customers.table");
  const locale = useLocale();

  return useMemo<ColumnDef<typeof features, CustomerRow>[]>(
    () => {
      const moneyFmt = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });
      const dateFmt = new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return [
        // 勾选列：表头只作用于当前页，单元格单行切换
        {
          id: "select",
          enableSorting: false,
          header: ({ table }) => {
            const pageRows = table.getRowModel().rows;
            const allSelected =
              pageRows.length > 0 && pageRows.every((r) => r.getIsSelected());
            const someSelected = pageRows.some((r) => r.getIsSelected());
            return (
              <Checkbox
                aria-label={t("select.all")}
                checked={
                  allSelected || (someSelected ? "indeterminate" : false)
                }
                onCheckedChange={(v) => {
                  const next = v === true;
                  for (const row of pageRows) row.toggleSelected(next);
                }}
              />
            );
          },
          cell: ({ row }) => (
            <Checkbox
              aria-label={t("select.row")}
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(v === true)}
            />
          ),
        },
        {
          accessorKey: "name",
          header: ({ column }) => (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 px-2 font-medium text-foreground"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              {t("columns.customer")}
              <ArrowUpDown className="size-3.5 text-muted-foreground" />
            </Button>
          ),
          cell: ({ row }) => {
            const c = row.original;
            return (
              <div className="flex items-center gap-3">
                <Avatar size="sm">
                  {c.avatarUrl !== null && (
                    <AvatarImage src={c.avatarUrl} alt={c.name} />
                  )}
                  <AvatarFallback
                    className={cn("text-xs font-medium", c.avatarColor)}
                  >
                    {initials(c.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.email}
                  </span>
                </div>
              </div>
            );
          },
        },
        {
          accessorKey: "company",
          header: ({ column }) => (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 px-2 font-medium text-foreground"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              {t("columns.company")}
              <ArrowUpDown className="size-3.5 text-muted-foreground" />
            </Button>
          ),
          cell: ({ row }) => (
            <span className="text-sm">{row.original.company}</span>
          ),
        },
        {
          accessorKey: "status",
          header: ({ column }) => (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 px-2 font-medium text-foreground"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              {t("columns.status")}
              <ArrowUpDown className="size-3.5 text-muted-foreground" />
            </Button>
          ),
          cell: ({ row }) => {
            const s = row.original.status;
            return (
              <Badge className={statusBadgeClass[s]}>{t(`status.${s}`)}</Badge>
            );
          },
        },
        {
          accessorKey: "spent",
          header: () => (
            <div className="text-end pe-2">{t("columns.spent")}</div>
          ),
          cell: ({ row }) => (
            <div className="text-end text-sm font-medium pe-2">
              {moneyFmt.format(row.original.spent)}
            </div>
          ),
        },
        {
          accessorKey: "createdAt",
          header: ({ column }) => (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 px-2 font-medium text-foreground"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              {t("columns.createdAt")}
              <ArrowUpDown className="size-3.5 text-muted-foreground" />
            </Button>
          ),
          cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
              {dateFmt.format(new Date(row.original.createdAt))}
            </span>
          ),
        },
        // admin 专属：行操作列（member 不渲染，整表只读；RLS 为最终兜底）
        ...(isAdmin
          ? [
              {
                id: "actions",
                header: () => (
                  <div className="text-end pe-2">{t("columns.actions")}</div>
                ),
                enableSorting: false,
                cell: ({ row }) => {
                  const c = row.original;
                  return (
                    <div className="flex justify-end pe-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="size-7">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">{t("actions.label")}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          {/* Radix 纪律：菜单 onSelect 后延迟 50ms 再开 Dialog，
                              等菜单关闭落定，避免关闭后二次打开竞态 */}
                          <DropdownMenuItem
                            onSelect={() => {
                              setTimeout(() => onEdit(c), 50);
                            }}
                          >
                            <Pencil className="size-4" />
                            {t("actions.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => {
                              setTimeout(() => onDelete(c), 50);
                            }}
                          >
                            <Trash2 className="size-4" />
                            {t("actions.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                },
              } satisfies ColumnDef<typeof features, CustomerRow>,
            ]
          : []),
      ];
    },
    [t, locale, isAdmin, onEdit, onDelete],
  );
}
