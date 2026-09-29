import { getTranslations } from "next-intl/server";
import OverviewTab from "@/components/dashboards/modern/overview-tab";
import StatCard from "@/components/shared/stat-card";
import TotalSales from "@/components/dashboards/modern/total-sales";
import UpdateBanner from "@/components/dashboards/modern/update-banner"
import TotalAssets from "@/components/dashboards/modern/totals-assets";
import ProjectsOrders from "@/components/dashboards/modern/projects-orders";
import StyleAwareWrapper from "@/components/shared/StyleAwareWrapper";
import StyleDivider from "@/components/shared/StyleDivider";
import { Handbag, Users, Box } from "lucide-react";

const page = async () => {
  const t = await getTranslations("dashboard");

  return (
    <>
      <div className="pb-4">
        <OverviewTab />
      </div>
      <StyleAwareWrapper
        lyraClassName="grid grid-cols-12 p-px gap-px bg-border"
        defaultClassName="grid grid-cols-12 gap-4"
      >
        <div className="col-span-12">
          <UpdateBanner />
        </div>
        <StyleDivider wrapperClassName="col-span-12" />
        <div className="lg:col-span-7 col-span-12">
          <TotalSales />
        </div>
        <div className="lg:col-span-5 col-span-12">
          <TotalAssets />
        </div>
        <StyleDivider wrapperClassName="col-span-12" />
        <div className="lg:col-span-4 col-span-12">
          <StatCard title={t("stats.weeklySales")} value="714k" badgeValue="40%" icon={Handbag} actionLabel={t("stats.cta")} />
        </div>
        <div className="lg:col-span-4 col-span-12">
          <StatCard title={t("stats.newUsers")} value="1.35m" badgeValue="20%" badgeVariant="negative" icon={Users} actionLabel={t("stats.cta")} />
        </div>
        <div className="lg:col-span-4 col-span-12">
          <StatCard title={t("stats.purchaseOrders")} value="1.72m" badgeValue="40%" icon={Box} actionLabel={t("stats.cta")} />
        </div>
        <StyleDivider wrapperClassName="col-span-12" />
        <div className="col-span-12">
          <ProjectsOrders />
        </div>
      </StyleAwareWrapper>
    </>
  );
};

export default page;

