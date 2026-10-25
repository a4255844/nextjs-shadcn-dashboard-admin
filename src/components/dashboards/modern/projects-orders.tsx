'use client';

import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import { CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { OrderStatus } from "@/components/dashboards/orders/types";
import type { RecentOrder } from "./types";

// 订单状态配色：与订单页保持一致的语义（待处理/已完成/已退款/已取消）
const statusConfig: Record<OrderStatus, { bg: string; text: string }> = {
  pending: { bg: "bg-[#f54900]/10", text: "text-[#f54900]" },
  paid: { bg: "bg-[#009689]/10", text: "text-[#009689]" },
  refunded: { bg: "bg-[#ec003f]/10", text: "text-[#ec003f]" },
  cancelled: { bg: "bg-muted", text: "text-muted-foreground" },
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function ProjectsOrders({ orders }: { orders: RecentOrder[] }) {
  const t = useTranslations("dashboard.orders");
  const locale = useLocale();
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
  const dateTime = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <DashboardCard className="flex flex-col gap-0!">
      {/* Header */}
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <BriefcaseBusiness size={16} className="text-foreground" />
          <span>{t("title")}</span>
        </CardTitle>
      </CardHeader>

      {/* Table */}
      <CardContent className="px-0!">
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="pl-4! px-4 py-3 h-auto text-sm font-normal text-muted-foreground w-[170px]">
                    {t("columns.order")}
                  </TableHead>
                  <TableHead className="px-4 py-3 h-auto text-sm font-normal text-muted-foreground">
                    {t("columns.customer")}
                  </TableHead>
                  <TableHead className="px-4 py-3 h-auto text-sm font-normal text-muted-foreground w-[130px]">
                    {t("columns.status")}
                  </TableHead>
                  <TableHead className="px-4 py-3 h-auto text-sm font-normal text-muted-foreground w-[120px]">
                    {t("columns.amount")}
                  </TableHead>
                  <TableHead className="px-4 py-3 h-auto text-sm font-normal text-muted-foreground w-[150px]">
                    {t("columns.createdAt")}
                  </TableHead>
                  <TableHead className="pr-4! px-2 py-3 h-auto w-[48px]" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {orders.length === 0 && (
                  <TableRow className="border-border">
                    <TableCell colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                )}
                {orders.map((order) => {
                  const { bg, text } = statusConfig[order.status];
                  return (
                    <TableRow key={order.id} className="border-border hover:bg-muted/30">
                      {/* Order number */}
                      <TableCell className="pl-4! px-4 py-3 w-[170px]">
                        <span className="text-sm font-medium text-foreground whitespace-nowrap">
                          {order.number}
                        </span>
                      </TableCell>

                      {/* Customer */}
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-[30px] w-[30px] shrink-0">
                            <AvatarFallback>{getInitials(order.customerName)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col leading-5">
                            <span className="text-sm font-medium text-foreground whitespace-nowrap">
                              {order.customerName}
                            </span>
                            <span className="text-sm font-normal text-muted-foreground whitespace-nowrap">
                              {order.customerEmail}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-4 py-3 w-[130px]">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-normal whitespace-nowrap ${bg} ${text}`}
                        >
                          {t(`status.${order.status}`)}
                        </span>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="px-4 py-3 w-[120px]">
                        <span className="text-sm font-normal text-muted-foreground whitespace-nowrap">
                          {money.format(order.amount)}
                        </span>
                      </TableCell>

                      {/* Created at */}
                      <TableCell className="px-4 py-3 w-[150px]">
                        <span className="text-sm font-normal text-muted-foreground whitespace-nowrap">
                          {dateTime.format(new Date(order.createdAt))}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="pr-4! px-2 py-3 w-[48px]">
                        <Button
                          asChild
                          variant="ghost"
                          className="p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          <Link href="/orders" aria-label={t("viewAll")}>
                            <ArrowUpRight size={16} className="text-foreground" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </DashboardCard>
  );
}
