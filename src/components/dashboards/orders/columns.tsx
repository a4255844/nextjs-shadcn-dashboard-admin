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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrderRow, OrderStatus } from "./types";

export const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

const statusBadgeClass: Record<OrderStatus, string> = {
  pending: "bg-chart-2/10 text-chart-2",
  paid: "bg-primary/10 text-primary",
  refunded: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

interface UseColumnsOptions {
  isAdmin: boolean;
  onEdit: (order: OrderRow) => void;
  onDelete: (order: OrderRow) => void;
}

export function useColumns({
  isAdmin,
  onEdit,
  onDelete,
}: UseColumnsOptions): ColumnDef<typeof features, OrderRow>[] {
  const t = useTranslations("pages.orders.table");
  const locale = useLocale();

  return useMemo<ColumnDef<typeof features, OrderRow>[]>(
    () => {
      const moneyFmt = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
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
          accessorKey: "number",
          header: ({ column }) => (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 px-2 font-medium text-foreground"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              {t("columns.number")}
              <ArrowUpDown className="size-3.5 text-muted-foreground" />
            </Button>
          ),
          cell: ({ row }) => (
            <span className="font-medium text-sm">{row.original.number}</span>
          ),
        },
        {
          accessorKey: "customerName",
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
          cell: ({ row }) => (
            <span className="text-sm">{row.original.customerName}</span>
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
          accessorKey: "amount",
          header: () => (
            <div className="text-end pe-2">{t("columns.amount")}</div>
          ),
          cell: ({ row }) => (
            <div className="text-end text-sm font-medium pe-2">
              {moneyFmt.format(row.original.amount)}
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
        ...(isAdmin
          ? [
              {
                id: "actions",
                header: () => (
                  <div className="text-end pe-2">{t("columns.actions")}</div>
                ),
                enableSorting: false,
                cell: ({ row }) => {
                  const o = row.original;
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
                          <DropdownMenuItem
                            onSelect={() => {
                              setTimeout(() => onEdit(o), 50);
                            }}
                          >
                            <Pencil className="size-4" />
                            {t("actions.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => {
                              setTimeout(() => onDelete(o), 50);
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
              } satisfies ColumnDef<typeof features, OrderRow>,
            ]
          : []),
      ];
    },
    [t, locale, isAdmin, onEdit, onDelete],
  );
}
