"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleX, Loader2, Building2 } from "lucide-react";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/lib/actions/organizations";
import type { AcceptInviteResult } from "@/lib/actions/organizations";

interface InviteAcceptProps {
  token: string;
}

type Phase =
  | { kind: "idle" }
  | { kind: "joining" }
  | { kind: "done"; result: AcceptInviteResult }
  | { kind: "error"; errorCode: NonNullable<AcceptInviteResult["errorCode"]> };

/**
 * 邀请确认卡：点击后调 acceptInvite action（join rpc + 写 active-org cookie），
 * 成功后进入对应结果态。
 */
export default function InviteAccept({ token }: InviteAcceptProps) {
  const t = useTranslations("orgs.invitePage");
  const tErrors = useTranslations("orgs.errors");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  async function handleAccept() {
    setPhase({ kind: "joining" });
    const result = await acceptInvite(token);
    if (result.ok) {
      setPhase({ kind: "done", result });
    } else {
      setPhase({
        kind: "error",
        errorCode: result.errorCode ?? "network",
      });
    }
  }

  function handleGoToWorkspace() {
    router.push("/customers");
    router.refresh();
  }

  return (
    <DashboardCard className="flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        {phase.kind === "done" ? (
          <CircleCheck className="size-6 text-primary" />
        ) : phase.kind === "error" ? (
          <CircleX className="size-6 text-destructive" />
        ) : (
          <Building2 className="size-6 text-muted-foreground" />
        )}
      </div>

      {phase.kind === "idle" || phase.kind === "joining" ? (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <Button
            onClick={handleAccept}
            disabled={phase.kind === "joining"}
            className="w-full"
          >
            {phase.kind === "joining" && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {phase.kind === "joining" ? t("joining") : t("accept")}
          </Button>
        </>
      ) : phase.kind === "done" ? (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold">
              {phase.result.alreadyMember
                ? t("alreadyMember")
                : t("successTitle")}
            </h1>
          </div>
          <Button onClick={handleGoToWorkspace} className="w-full">
            {t("go")}
          </Button>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold">{t("errorTitle")}</h1>
            <p className="text-sm text-muted-foreground">
              {phase.errorCode === "invalid"
                ? t("error.invalid")
                : phase.errorCode === "expired"
                  ? t("error.expired")
                  : phase.errorCode === "used"
                    ? t("error.used")
                    : phase.errorCode === "auth_required"
                      ? tErrors("authRequired")
                      : t("error.generic")}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleGoToWorkspace}
            className="w-full"
          >
            {t("backHome")}
          </Button>
        </>
      )}
    </DashboardCard>
  );
}
