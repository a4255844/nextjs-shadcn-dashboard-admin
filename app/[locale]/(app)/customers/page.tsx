import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Users, CircleCheck, Gem, TrendingDown } from "lucide-react";
import StatCard from "@/components/shared/stat-card";
import StyleAwareWrapper from "@/components/shared/StyleAwareWrapper";
import StyleDivider from "@/components/shared/StyleDivider";
import CustomersTable from "@/components/dashboards/customers/customers-table";

const page = async () => {
  const t = await getTranslations("customers");

  return (
    <StyleAwareWrapper
      lyraClassName="grid grid-cols-12 p-px gap-px bg-border"
      defaultClassName="grid grid-cols-12 gap-4"
    >
      {/* Row 1: 4 张统计卡 */}
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.total")}
          value="2,420"
          badgeValue="+12%"
          icon={Users}
          actionLabel={t("stats.cta")}
        />
      </div>
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.active")}
          value="1,840"
          badgeValue="+8%"
          icon={CircleCheck}
          actionLabel={t("stats.cta")}
        />
      </div>
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.vip")}
          value="280"
          badgeValue="+15%"
          icon={Gem}
          actionLabel={t("stats.cta")}
        />
      </div>
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.atRisk")}
          value="120"
          badgeValue="-5%"
          badgeVariant="negative"
          icon={TrendingDown}
          actionLabel={t("stats.cta")}
        />
      </div>
      <StyleDivider wrapperClassName="col-span-12" />

      {/* Row 2: 客户表格（用 Suspense 包裹，因内部使用 useSearchParams） */}
      <div className="col-span-12">
        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              {t("table.loading")}
            </div>
          }
        >
          <CustomersTable />
        </Suspense>
      </div>
    </StyleAwareWrapper>
  );
};

export default page;
