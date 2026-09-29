import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { cn } from "cn";
import type { RegionKey } from "./types";

// 点阵进度条：共 DOT_COUNT 个小格，按 FILL_RATIO 填充
const DOT_COUNT = 40;
const FILL_RATIO = 0.4;

// 区域图例（顺序即展示顺序）
const regions: RegionKey[] = ["asia", "usa", "europe"];

export default function KeyInsights() {
  const t = useTranslations("ecommerce.keyInsights");
  const filled = Math.round(DOT_COUNT * FILL_RATIO);

  return (
    <DashboardCard>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <KeyRound size={16} className="text-muted-foreground" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-6">
        {/* 大数字 + 环比 */}
        <div className="flex flex-col gap-1">
          <h3 className="text-3xl font-semibold tracking-[-0.5px]">$20,320</h3>
          <p className="text-sm font-normal text-muted-foreground">
            <span className="font-medium text-chart-2">+40%</span>{" "}
            {t("vsLastMonth")}
          </p>
        </div>

        {/* 点阵进度条 */}
        <div className="flex gap-1" role="img" aria-label="40%">
          {Array.from({ length: DOT_COUNT }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-3 w-1 rounded-full",
                i < filled ? "bg-foreground" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* 区域图例 */}
        <div className="flex items-center gap-4 flex-wrap">
          {regions.map((region) => (
            <span
              key={region}
              className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground"
            >
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              {t(`regions.${region}`)}
            </span>
          ))}
        </div>
      </CardContent>
    </DashboardCard>
  );
}
