import { getTranslations } from "next-intl/server";
import { Handbag, Users, Box } from "lucide-react";
import WelcomeBanner from "@/components/dashboards/ecommerce/welcome-banner";
import KeyInsights from "@/components/dashboards/ecommerce/key-insights";
import SalesOverview from "@/components/dashboards/ecommerce/sales-overview";
import SalesDistribution from "@/components/dashboards/ecommerce/sales-distribution";
import StatCard from "@/components/shared/stat-card";
import StyleAwareWrapper from "@/components/shared/StyleAwareWrapper";
import StyleDivider from "@/components/shared/StyleDivider";

const page = async () => {
  const t = await getTranslations("ecommerce.stats");

  return (
    <StyleAwareWrapper
      lyraClassName="grid grid-cols-12 p-px gap-px bg-border"
      defaultClassName="grid grid-cols-12 gap-4"
    >
      {/* Row 1: 问候横幅 + 关键洞察 */}
      <div className="lg:col-span-8 col-span-12">
        <WelcomeBanner />
      </div>
      <div className="lg:col-span-4 col-span-12">
        <KeyInsights />
      </div>
      <StyleDivider wrapperClassName="col-span-12" />

      {/* Row 2: 销售总览 + 销售分布 */}
      <div className="lg:col-span-8 col-span-12">
        <SalesOverview />
      </div>
      <div className="lg:col-span-4 col-span-12">
        <SalesDistribution />
      </div>
      <StyleDivider wrapperClassName="col-span-12" />

      {/* Row 3: 统计卡 */}
      <div className="lg:col-span-4 col-span-12">
        <StatCard title={t("weeklySales")} value="714k" badgeValue="40%" icon={Handbag} actionLabel={t("cta")} />
      </div>
      <div className="lg:col-span-4 col-span-12">
        <StatCard title={t("newUsers")} value="1.35m" badgeValue="20%" badgeVariant="negative" icon={Users} actionLabel={t("cta")} />
      </div>
      <div className="lg:col-span-4 col-span-12">
        <StatCard title={t("purchaseOrders")} value="1.72m" badgeValue="40%" icon={Box} actionLabel={t("cta")} />
      </div>
    </StyleAwareWrapper>
  );
};

export default page;
