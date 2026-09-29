import { useTranslations } from "next-intl";
import { Box } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import type { Channel } from "./types";

// 渠道 mock 数据：金额/涨幅等后端接入后替换
const channels: Channel[] = [
  { key: "website", amount: "$4,365", change: "+47%", share: 0.42 },
  { key: "marketplace", amount: "$4,500", change: "+21%", share: 0.3 },
  { key: "affiliate", amount: "$18,356", change: "+17%", share: 0.28 },
];

// 渠道对应的刻度颜色（与主题色联动）
const channelColors: Record<Channel["key"], string> = {
  website: "var(--primary)",
  marketplace: "color-mix(in srgb, var(--primary) 55%, transparent)",
  affiliate: "color-mix(in srgb, var(--primary) 22%, transparent)",
};

// 刻度环参数
const TICK_COUNT = 72;
const CENTER = 80;
const R_INNER = 62;
const R_OUTER = 74;

// 生成一圈径向刻度线，从顶部顺时针排列
const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
  const angle = (i / TICK_COUNT) * Math.PI * 2 - Math.PI / 2;
  return {
    x1: CENTER + R_INNER * Math.cos(angle),
    y1: CENTER + R_INNER * Math.sin(angle),
    x2: CENTER + R_OUTER * Math.cos(angle),
    y2: CENTER + R_OUTER * Math.sin(angle),
    // 按累计占比决定这根刻度属于哪个渠道
    color: (() => {
      const pos = i / TICK_COUNT;
      let acc = 0;
      for (const channel of channels) {
        acc += channel.share;
        if (pos < acc) return channelColors[channel.key];
      }
      return channelColors[channels[channels.length - 1].key];
    })(),
  };
});

export default function SalesDistribution() {
  const t = useTranslations("ecommerce.salesDistribution");

  return (
    <DashboardCard>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <Box size={16} className="text-muted-foreground" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 py-6">
        {/* 刻度环 + 中心总额 */}
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 160 160" className="w-full h-full">
            {ticks.map((tick, i) => (
              <line
                key={i}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke={tick.color}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <Box size={16} className="text-muted-foreground" />
            <span className="text-xs font-normal text-muted-foreground">
              {t("totalRevenue")}
            </span>
            <span className="text-sm font-semibold">$284,920.00</span>
          </div>
        </div>

        {/* 渠道列表 */}
        <div className="flex flex-col gap-3 w-full">
          {channels.map((channel) => (
            <div
              key={channel.key}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2 text-sm font-normal text-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: channelColors[channel.key] }}
                />
                {t(`channels.${channel.key}`)}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {channel.amount}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-0 bg-chart-2/10! text-chart-2! px-1.5"
                  )}
                >
                  {channel.change}
                </Badge>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </DashboardCard>
  );
}
