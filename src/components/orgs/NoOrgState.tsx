"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Plus } from "lucide-react";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Button } from "@/components/ui/button";
import CreateOrgDialog from "./CreateOrgDialog";

/** 无组织空态：customers 等业务页在用户不属于任何组织时显示 */
export default function NoOrgState() {
  const t = useTranslations("orgs.noOrgState");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <DashboardCard className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Building2 className="size-6 text-muted-foreground" />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <Button onClick={() => setCreateOpen(true)}>
        <Plus className="size-4" />
        {t("cta")}
      </Button>
      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
    </DashboardCard>
  );
}
