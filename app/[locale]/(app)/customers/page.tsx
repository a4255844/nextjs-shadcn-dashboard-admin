import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Users, CircleCheck, Gem, TrendingDown } from "lucide-react";
import StatCard from "@/components/shared/stat-card";
import StyleAwareWrapper from "@/components/shared/StyleAwareWrapper";
import StyleDivider from "@/components/shared/StyleDivider";
import CustomersTable from "@/components/dashboards/customers/customers-table";
import { getCustomers } from "@/lib/api/customers";

const page = async () => {
  const t = await getTranslations("customers");

  // RSC 直查 DB（真实数据源）；表格统计都从同一份 rows 聚合
  const rows = await getCustomers();
  const total = rows.length;
  const activeCount = rows.filter((r) => r.status === "active").length;
  const vipCount = rows.filter((r) => r.status === "vip").length;
  const atRiskCount = rows.filter((r) => r.status === "atRisk").length;

  return (
    <StyleAwareWrapper
      lyraClassName="grid grid-cols-12 p-px gap-px bg-border"
      defaultClassName="grid grid-cols-12 gap-4"
    >
      {/* Row 1: 4 张统计卡（数值来自 DB 聚合；badge 为静态演示值，接时间序列数据后再动态化） */}
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.total")}
          value={total.toLocaleString()}
          badgeValue="+12%"
          icon={Users}
          actionLabel={t("stats.cta")}
        />
      </div>
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.active")}
          value={activeCount.toLocaleString()}
          badgeValue="+8%"
          icon={CircleCheck}
          actionLabel={t("stats.cta")}
        />
      </div>
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.vip")}
          value={vipCount.toLocaleString()}
          badgeValue="+15%"
          icon={Gem}
          actionLabel={t("stats.cta")}
        />
      </div>
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.atRisk")}
          value={atRiskCount.toLocaleString()}
          badgeValue="-5%"
          badgeVariant="negative"
          icon={TrendingDown}
          actionLabel={t("stats.cta")}
        />
      </div>
      <StyleDivider wrapperClassName="col-span-12" />

      {/* Row 2: 客户表格（Suspense 包裹：内部 useSearchParams + DB 数据注入） */}
      <div className="col-span-12">
        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              {t("table.loading")}
            </div>
          }
        >
          <CustomersTable rows={rows} />
        </Suspense>
      </div>
    </StyleAwareWrapper>
  );
};

export default page;
