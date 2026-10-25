import { getLocale, getTranslations } from "next-intl/server";
import OverviewTab from "@/components/dashboards/modern/overview-tab";
import StatCard from "@/components/shared/stat-card";
import TotalSales from "@/components/dashboards/modern/total-sales";
import UpdateBanner from "@/components/dashboards/modern/update-banner"
import TotalAssets from "@/components/dashboards/modern/totals-assets";
import ProjectsOrders from "@/components/dashboards/modern/projects-orders";
import StyleAwareWrapper from "@/components/shared/StyleAwareWrapper";
import StyleDivider from "@/components/shared/StyleDivider";
import NoOrgState from "@/components/orgs/NoOrgState";
import { Handbag, Clock, Users } from "lucide-react";
import { getActiveOrg } from "@/lib/api/organizations";
import { getCurrentUser } from "@/lib/api/auth";
import { getDashboardData } from "@/lib/api/dashboard";
import { parseDashboardRange } from "@/components/dashboards/modern/types";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// 与上一等长周期相比的涨跌幅；没有基数（上一周期为 0）时返回 null，不编造百分比
function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function formatDelta(pct: number | null): {
  badgeValue?: string;
  badgeVariant: "positive" | "negative";
} {
  if (pct === null) return { badgeVariant: "positive" };
  return {
    badgeValue: `${pct >= 0 ? "+" : ""}${pct}%`,
    badgeVariant: pct >= 0 ? "positive" : "negative",
  };
}

const page = async ({ searchParams }: DashboardPageProps) => {
  const t = await getTranslations("dashboard");

  const org = await getActiveOrg();
  if (org === null) {
    return <NoOrgState />;
  }

  const rawRange = (await searchParams).range;
  const range =
    parseDashboardRange(typeof rawRange === "string" ? rawRange : null) ?? "month";

  const [data, user, locale] = await Promise.all([
    getDashboardData(org.id, range),
    getCurrentUser(),
    getLocale(),
  ]);

  const userName =
    user === null ? "" : (user.firstName ?? user.email.split("@")[0] ?? "");

  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const count = (n: number) => n.toLocaleString(locale);

  const revenuePct = deltaPct(data.revenue.current, data.revenue.previous);
  const revenueDelta = formatDelta(revenuePct);
  const customerDelta = formatDelta(
    deltaPct(data.newCustomers.current, data.newCustomers.previous),
  );

  return (
    <>
      <div className="pb-4">
        <OverviewTab userName={userName} range={range} orgId={org.id} />
      </div>
      <StyleAwareWrapper
        lyraClassName="grid grid-cols-12 p-px gap-px bg-border"
        defaultClassName="grid grid-cols-12 gap-4"
      >
        <div className="col-span-12">
          <UpdateBanner pct={revenuePct} />
        </div>
        <StyleDivider wrapperClassName="col-span-12" />
        <div className="lg:col-span-7 col-span-12">
          <TotalSales series={data.sales} />
        </div>
        <div className="lg:col-span-5 col-span-12">
          <TotalAssets counts={data.statusCounts} />
        </div>
        <StyleDivider wrapperClassName="col-span-12" />
        <div className="lg:col-span-4 col-span-12">
          <StatCard
            title={t("stats.revenue")}
            value={money.format(data.revenue.current)}
            badgeValue={revenueDelta.badgeValue}
            badgeVariant={revenueDelta.badgeVariant}
            icon={Handbag}
            actionLabel={t("stats.cta")}
          />
        </div>
        <div className="lg:col-span-4 col-span-12">
          <StatCard
            title={t("stats.newCustomers")}
            value={count(data.newCustomers.current)}
            badgeValue={customerDelta.badgeValue}
            badgeVariant={customerDelta.badgeVariant}
            icon={Users}
            actionLabel={t("stats.cta")}
          />
        </div>
        <div className="lg:col-span-4 col-span-12">
          <StatCard
            title={t("stats.pendingOrders")}
            value={count(data.pendingOrders)}
            icon={Clock}
            actionLabel={t("stats.cta")}
          />
        </div>
        <StyleDivider wrapperClassName="col-span-12" />
        <div className="col-span-12">
          <ProjectsOrders orders={data.recentOrders} />
        </div>
      </StyleAwareWrapper>
    </>
  );
};

export default page;
