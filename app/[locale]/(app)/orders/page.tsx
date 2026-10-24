import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { FileText, DollarSign, CheckCircle2, Clock } from "lucide-react";
import StatCard from "@/components/shared/stat-card";
import StyleAwareWrapper from "@/components/shared/StyleAwareWrapper";
import StyleDivider from "@/components/shared/StyleDivider";
import OrdersTable from "@/components/dashboards/orders/orders-table";
import NoOrgState from "@/components/orgs/NoOrgState";
import { getOrders } from "@/lib/api/orders";
import { getCustomers } from "@/lib/api/customers";
import { getActiveOrg } from "@/lib/api/organizations";

const page = async () => {
  const t = await getTranslations("pages.orders");

  const org = await getActiveOrg();
  if (org === null) {
    return <NoOrgState />;
  }

  const rows = await getOrders(org.id);
  const customers = await getCustomers(org.id);

  const total = rows.length;
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const paidCount = rows.filter((r) => r.status === "paid").length;
  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <StyleAwareWrapper
      lyraClassName="grid grid-cols-12 p-px gap-px bg-border"
      defaultClassName="grid grid-cols-12 gap-4"
    >
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.total")}
          value={total.toLocaleString()}
          badgeValue="+12%"
          icon={FileText}
          actionLabel={t("stats.cta")}
        />
      </div>
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.totalAmount")}
          value={`$${totalAmount.toLocaleString()}`}
          badgeValue="+8%"
          icon={DollarSign}
          actionLabel={t("stats.cta")}
        />
      </div>
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.paid")}
          value={paidCount.toLocaleString()}
          badgeValue="+15%"
          icon={CheckCircle2}
          actionLabel={t("stats.cta")}
        />
      </div>
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.pending")}
          value={pendingCount.toLocaleString()}
          badgeValue="-5%"
          badgeVariant="negative"
          icon={Clock}
          actionLabel={t("stats.cta")}
        />
      </div>
      <StyleDivider wrapperClassName="col-span-12" />

      <div className="col-span-12">
        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              {t("table.loading")}
            </div>
          }
        >
          {/* key=org.id：切换组织时强制重挂载，清空勾选/搜索/弹窗等本地状态 */}
          <OrdersTable
            key={org.id}
            rows={rows}
            orgId={org.id}
            isAdmin={org.role === "admin"}
            customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          />
        </Suspense>
      </div>
    </StyleAwareWrapper>
  );
};

export default page;
