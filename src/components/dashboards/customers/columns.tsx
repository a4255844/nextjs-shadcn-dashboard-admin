"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { ArrowUpDown, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "cn";
import type { CustomerRow, StatusKey } from "./types";

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

// 列定义 hook：i18n + locale 感知，返回 memoized 的 ColumnDef 数组
export function useColumns(): ColumnDef<CustomerRow>[] {
  const t = useTranslations("customers.table");
  const locale = useLocale();

  return useMemo<ColumnDef<CustomerRow>[]>(
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
      });

      return [
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
        {
          id: "actions",
          header: () => (
            <div className="text-end pe-2">{t("columns.actions")}</div>
          ),
          enableSorting: false,
          cell: ({ row }) => (
            <div className="flex justify-end pe-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="size-7">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">{t("actions.label")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem>
                    <Eye className="size-4" />
                    {t("actions.view")}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Pencil className="size-4" />
                    {t("actions.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">
                    <Trash2 className="size-4" />
                    {t("actions.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        },
      ];
    },
    [t, locale],
  );
}
