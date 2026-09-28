import OverviewTab from "@/components/dashboards/modern/overview-tab";
import StatCard from "@/components/dashboards/modern/stat-card";
import TotalSales from "@/components/dashboards/modern/total-sales";
import UpdateBanner from "@/components/dashboards/modern/update-banner"
import TotalAssets from "@/components/dashboards/modern/totals-assets";
import ProjectsOrders from "@/components/dashboards/modern/projects-orders";
import StyleAwareWrapper from "@/components/shared/StyleAwareWrapper";
import StyleDivider from "@/components/shared/StyleDivider";
import { Handbag, Users, Box } from "lucide-react";

const page = () => {
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
          <StatCard title="Weekly sales" value="714k" badgeValue="40%" icon={Handbag} />
        </div>
        <div className="lg:col-span-4 col-span-12">
          <StatCard title="New users" value="1.35m" badgeValue="20%" badgeVariant="negative" icon={Users} />
        </div>
        <div className="lg:col-span-4 col-span-12">
          <StatCard title="Purchase Orders" value="1.72m" badgeValue="40%" icon={Box} />
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

