import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Users, DollarSign, Calculator, Crown } from "lucide-react";
import StatCard from "@/components/shared/stat-card";
import StyleAwareWrapper from "@/components/shared/StyleAwareWrapper";
import StyleDivider from "@/components/shared/StyleDivider";
import CustomersTable from "@/components/dashboards/customers/customers-table";
import NoOrgState from "@/components/orgs/NoOrgState";
import { getCustomers } from "@/lib/api/customers";
import { getActiveOrg } from "@/lib/api/organizations";
import type { StatusKey } from "@/components/dashboards/customers/types";

// 分群直接复用客户状态（vip / atRisk）：与客户表的状态筛选是同一套语义，
// 不需要额外的分群字段或定时计算任务。
type SegmentSlug = "high-value" | "at-risk";

const SEGMENT_STATUS: Record<SegmentSlug, StatusKey> = {
  "high-value": "vip",
  "at-risk": "atRisk",
};

// 信任边界：path 参数可能是任意字符串，校验通过后才允许收窄为 SegmentSlug
function parseSegmentSlug(v: string): SegmentSlug | null {
  return v === "high-value" || v === "at-risk" ? v : null;
}

export default async function CustomerSegmentPage({
  params,
}: {
  params: Promise<{ segment: string }>;
}) {
  const { segment } = await params;
  const slug = parseSegmentSlug(segment);
  if (slug === null) notFound();
  const status = SEGMENT_STATUS[slug];

  const t = await getTranslations("pages.customers.segments");

  // 当前激活组织（无组织时渲染创建引导空态）
  const org = await getActiveOrg();
  if (org === null) {
    return <NoOrgState />;
  }

  // 状态过滤下推到 DB：只取该分群的客户，聚合也只用这一份数据
  const rows = await getCustomers(org.id, status);

  const total = rows.length;
  const totalSpent = rows.reduce((sum, r) => sum + r.spent, 0);
  const avgSpent = total === 0 ? 0 : Math.round(totalSpent / total);
  const topSpent = rows.reduce((max, r) => Math.max(max, r.spent), 0);

  return (
    <StyleAwareWrapper
      lyraClassName="grid grid-cols-12 p-px gap-px bg-border"
      defaultClassName="grid grid-cols-12 gap-4"
    >
      {/* 分群指标：无同比基数，不展示 badge（避免编造涨跌） */}
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.customers")}
          value={total.toLocaleString()}
          icon={Users}
          actionLabel={t("stats.cta")}
        />
      </div>
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.totalSpent")}
          value={`$${totalSpent.toLocaleString()}`}
          icon={DollarSign}
          actionLabel={t("stats.cta")}
        />
      </div>
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.avgSpent")}
          value={`$${avgSpent.toLocaleString()}`}
          icon={Calculator}
          actionLabel={t("stats.cta")}
        />
      </div>
      <div className="lg:col-span-3 col-span-6 sm:col-span-3">
        <StatCard
          title={t("stats.topSpent")}
          value={`$${topSpent.toLocaleString()}`}
          icon={Crown}
          actionLabel={t("stats.cta")}
        />
      </div>
      <StyleDivider wrapperClassName="col-span-12" />

      <div className="col-span-12">
        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              {t("loading")}
            </div>
          }
        >
          {/* key=org.id：切换组织时强制重挂载，清空勾选/搜索/弹窗等本地状态。
              lockedStatus：状态由路由固定，隐藏状态下拉与新建/导入入口 */}
          <CustomersTable
            key={org.id}
            rows={rows}
            orgId={org.id}
            isAdmin={org.role === "admin"}
            lockedStatus={status}
          />
        </Suspense>
      </div>
    </StyleAwareWrapper>
  );
}
