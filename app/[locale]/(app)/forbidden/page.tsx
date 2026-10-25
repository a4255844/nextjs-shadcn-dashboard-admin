import { getTranslations } from "next-intl/server";
import { ShieldAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { getActiveOrg } from "@/lib/api/organizations";
import { firstAccessibleRoute } from "@/lib/route-guard";

/**
 * 无权访问页。
 * 已登录但角色不含目标页面权限时，由 requirePermission 跳转到这里；
 * 未登录由 proxy 统一送去登录页（/forbidden 在受保护清单内）。
 */
export default async function ForbiddenPage() {
  const t = await getTranslations("pages.forbidden");
  const org = await getActiveOrg();
  const back = firstAccessibleRoute(org?.permissions ?? []);

  return (
    <DashboardCard className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <ShieldAlert className="size-6 text-muted-foreground" />
      </div>
      <div className="flex max-w-md flex-col items-center gap-1 text-center">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <Button asChild>
        <Link href={back}>{t("back")}</Link>
      </Button>
    </DashboardCard>
  );
}
