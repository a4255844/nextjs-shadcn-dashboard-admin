'use client';

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/shared/dashboard-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AnimatedTooltipContentProps,
  SalesPeriodKey,
  SalesSeriesMap,
} from "./types";

const chartConfig = {
  paid: { label: "Paid", color: "var(--color-primary)" },
  unpaid: { label: "Pending", color: "color-mix(in srgb, var(--primary) 60%, transparent)" },
} satisfies ChartConfig;

const periodOptions: SalesPeriodKey[] = ["d30", "d7", "d90"];

// 服务端按天给出 YYYY-MM-DD（服务器时区），客户端按 locale 格式化
function parseDayKey(v: string): Date {
  return new Date(`${v}T00:00:00`);
}

function AnimatedTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
  config,
  locale,
}: AnimatedTooltipContentProps) {
  const money = useMemo(
    () => new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }),
    [locale],
  );

  if (!active || !payload?.length) return null;
  const items = payload.filter((item) => item.type !== "none" && item.value !== undefined);
  if (!items.length) return null;
  return (
    <div className="grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      {!hideLabel && label && <div className="font-medium">{label}</div>}
      <div className="grid gap-1.5">
        {items.map((item, index) => (
          <div key={index} className="flex w-full items-center gap-2">
            <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{config?.[item.dataKey ?? ""]?.label ?? item.name}</span>
            <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
              {money.format(item.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TotalSales({ series }: { series: SalesSeriesMap }) {
  const t = useTranslations("dashboard.sales");
  const locale = useLocale();
  const [period, setPeriod] = useState<SalesPeriodKey>(periodOptions[0]);

  // chartConfig 的 label 需要翻译，挂在组件内随 locale 重建
  const localizedConfig = {
    paid: { ...chartConfig.paid, label: t("series.paid") },
    unpaid: { ...chartConfig.unpaid, label: t("series.unpaid") },
  } satisfies ChartConfig;

  const money = useMemo(
    () => new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }),
    [locale],
  );
  const compactMoney = useMemo(
    () => new Intl.NumberFormat(locale, {
      notation: "compact",
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 1,
    }),
    [locale],
  );
  const dayLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }),
    [locale],
  );

  const active = series[period];
  const chartData = active.points.map((p) => ({
    ...p,
    label: dayLabel.format(parseDayKey(p.date)),
  }));
  const deltaPct =
    active.previousTotal > 0
      ? Math.round(((active.total - active.previousTotal) / active.previousTotal) * 100)
      : null;
  const tickInterval = Math.max(Math.ceil(chartData.length / 7) - 1, 0);

  return (
    <DashboardCard className="flex flex-col gap-0!">
      {/* Header */}
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp size={16} className="text-muted-foreground" />
          {t("title")}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-5 flex flex-col gap-6">
        {/* Stats row + period selector */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <span className="text-base font-normal text-foreground leading-6">{t("totalLabel")}</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl font-semibold tracking-[-0.3px] text-foreground leading-8">
                {money.format(active.total)}
              </span>
              {deltaPct !== null && (
                <>
                  <span className={`text-sm font-medium ${deltaPct >= 0 ? "text-chart-2" : "text-destructive"}`}>
                    {deltaPct >= 0 ? "+" : ""}{deltaPct}%
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">{t("vsPrevious")}</span>
                </>
              )}
            </div>
          </div>

          <Select value={period} onValueChange={(v) => v && setPeriod(v as SalesPeriodKey)}>
            <SelectTrigger className="h-auto! w-fit text-sm font-medium text-foreground border-border shadow-[0px_1px_2px_rgba(0,0,0,0.05)] cursor-pointer gap-1.5 px-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              position="popper"
              align="start"
              sideOffset={4}
              className="rounded-md shadow-md"
            >
              {periodOptions.map((opt) => (
                <SelectItem key={opt} value={opt} className="cursor-pointer">
                  {t(`periods.${opt}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chart */}
        <ChartContainer config={localizedConfig} className="h-[215px]! w-full">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 4, bottom: 0, left: -10 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval={tickInterval}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              domain={[0, "auto"]}
              allowDecimals={false}
              tickFormatter={(v: number) => (v === 0 ? "0" : compactMoney.format(v))}
            />
            <ChartTooltip
              cursor={{
                stroke: "var(--border)",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
              content={<AnimatedTooltipContent config={localizedConfig} locale={locale} />}
            />
            {/* 已支付收入 — 实线主色 */}
            <Line
              dataKey="paid"
              type="linear"
              stroke="var(--color-primary)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, fill: "var(--color-primary)", strokeWidth: 0 }}
              isAnimationActive
              animationBegin={0}
              animationDuration={700}
              animationEasing="ease-out"
            />
            {/* 待支付金额 — 虚线弱化 */}
            <Line
              dataKey="unpaid"
              type="linear"
              stroke="color-mix(in srgb, var(--primary) 60%, transparent)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, fill: "color-mix(in srgb, var(--primary) 60%, transparent)", strokeWidth: 0 }}
              isAnimationActive
              animationBegin={120}
              animationDuration={700}
              animationEasing="ease-out"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </DashboardCard>
  );
}
