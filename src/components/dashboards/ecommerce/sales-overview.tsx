'use client';

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamSalesPoint } from "./types";

// 数据 key 与展示文案解耦：周期用稳定 key，展示时再翻译
type PeriodKey = "d30" | "d7" | "d90";

// 堆叠柱状图 mock 数据（单位 k，等后端接入后替换）
const allChartData: Record<PeriodKey, TeamSalesPoint[]> = {
  d30: [
    { date: "Jan 1", teamA: 8, teamB: 5, teamC: 4 },
    { date: "Jan 4", teamA: 6, teamB: 4, teamC: 3 },
    { date: "Jan 8", teamA: 9, teamB: 6, teamC: 5 },
    { date: "Jan 12", teamA: 7, teamB: 5, teamC: 4 },
    { date: "Jan 16", teamA: 5, teamB: 4, teamC: 3 },
    { date: "Jan 20", teamA: 8, teamB: 6, teamC: 5 },
    { date: "Jan 24", teamA: 10, teamB: 7, teamC: 6 },
    { date: "Jan 28", teamA: 7, teamB: 5, teamC: 4 },
    { date: "Feb 1", teamA: 9, teamB: 6, teamC: 5 },
    { date: "Feb 4", teamA: 6, teamB: 5, teamC: 4 },
    { date: "Feb 6", teamA: 8, teamB: 6, teamC: 4 },
  ],
  d7: [
    { date: "Jan 31", teamA: 6, teamB: 5, teamC: 3 },
    { date: "Feb 1", teamA: 9, teamB: 6, teamC: 5 },
    { date: "Feb 2", teamA: 7, teamB: 4, teamC: 4 },
    { date: "Feb 3", teamA: 8, teamB: 6, teamC: 3 },
    { date: "Feb 4", teamA: 6, teamB: 5, teamC: 4 },
    { date: "Feb 5", teamA: 9, teamB: 5, teamC: 5 },
    { date: "Feb 6", teamA: 8, teamB: 6, teamC: 4 },
  ],
  d90: [
    { date: "Nov 10", teamA: 6, teamB: 4, teamC: 3 },
    { date: "Nov 25", teamA: 8, teamB: 5, teamC: 4 },
    { date: "Dec 8", teamA: 7, teamB: 6, teamC: 4 },
    { date: "Dec 20", teamA: 10, teamB: 6, teamC: 5 },
    { date: "Jan 2", teamA: 8, teamB: 5, teamC: 4 },
    { date: "Jan 15", teamA: 9, teamB: 6, teamC: 5 },
    { date: "Jan 28", teamA: 7, teamB: 5, teamC: 4 },
    { date: "Feb 6", teamA: 8, teamB: 6, teamC: 4 },
  ],
};

// label 需要翻译，因此颜色定义在此，渲染时合并翻译后的 label
const chartConfig = {
  teamA: { label: "Team A", color: "var(--primary)" },
  teamB: { label: "Team B", color: "color-mix(in srgb, var(--primary) 55%, transparent)" },
  teamC: { label: "Team C", color: "color-mix(in srgb, var(--primary) 25%, transparent)" },
} satisfies ChartConfig;

const periodOptions: PeriodKey[] = ["d30", "d7", "d90"];

// 团队堆叠顺序（teamA 在最底部）
const seriesKeys = ["teamA", "teamB", "teamC"] as const;

export default function SalesOverview() {
  const t = useTranslations("ecommerce.salesOverview");
  const [period, setPeriod] = useState<PeriodKey>(periodOptions[0]);

  // chartConfig 的 label 随 locale 重建
  const localizedConfig = {
    teamA: { ...chartConfig.teamA, label: t("series.teamA") },
    teamB: { ...chartConfig.teamB, label: t("series.teamB") },
    teamC: { ...chartConfig.teamC, label: t("series.teamC") },
  } satisfies ChartConfig;

  const chartData = allChartData[period];

  return (
    <DashboardCard>
      {/* Header */}
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 size={16} className="text-muted-foreground" />
          {t("title")}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-5 flex flex-col gap-6">
        {/* Revenue 概览 + 周期选择 */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <span className="text-base font-normal text-foreground leading-6">
              {t("revenueLabel")}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl font-semibold tracking-[-0.3px] text-foreground leading-8">
                $640,000
              </span>
              <span className="text-sm font-medium text-chart-2">+8.0%</span>
              <span className="text-sm font-normal text-muted-foreground">
                {t("vsLastMonth")}
              </span>
            </div>
          </div>

          <Select value={period} onValueChange={(v) => v && setPeriod(v as PeriodKey)}>
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

        {/* 图表 */}
        <ChartContainer config={localizedConfig} className="h-[260px]! w-full">
          <BarChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval={0}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              ticks={[0, 5, 10, 15, 20, 25]}
              domain={[0, 25]}
              tickFormatter={(v) => (v === 0 ? "0" : `${v}k`)}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            {seriesKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="sales"
                fill={`var(--color-${key})`}
                // 最顶段圆角，其余直角
                radius={index === seriesKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={28}
              />
            ))}
          </BarChart>
        </ChartContainer>

        {/* 团队图例 */}
        <div className="flex items-center gap-5 flex-wrap">
          {seriesKeys.map((key) => (
            <span
              key={key}
              className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground"
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: chartConfig[key].color }}
              />
              {localizedConfig[key].label}
            </span>
          ))}
          <Badge className="ml-auto bg-chart-2/10! text-chart-2!">
            <TrendingUp size={12} className="mr-1" />
            +18.0%
          </Badge>
        </div>
      </CardContent>
    </DashboardCard>
  );
}
