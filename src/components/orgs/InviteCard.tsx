"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ActiveInvite } from "@/lib/api/members";
import { createInvite } from "@/lib/actions/organizations";
import InviteLinkField from "@/components/orgs/InviteLinkField";

interface InviteCardProps {
  orgId: string;
  /** 服务端查出的活跃邀请；null = 无活跃链接 */
  invite: ActiveInvite | null;
}

/**
 * 邀请状态卡片（admin 可见）。不持有 token state——
 * 生成/重生成走 createInvite action 后 router.refresh()，
 * 以服务端 get_active_invite 的结果为唯一真源。
 */
export default function InviteCard({ orgId, invite }: InviteCardProps) {
  const t = useTranslations("orgs.inviteCard");
  const tInvite = useTranslations("orgs.invite");
  const tToasts = useTranslations("orgs.toasts");
  const tErrors = useTranslations("orgs.errors");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const dateFmt = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleGenerate() {
    startTransition(async () => {
      const result = await createInvite(orgId);
      if (result.ok) {
        toast.success(tToasts("inviteRegenerated"));
        router.refresh();
      } else {
        // not_admin 理论上不会发生（入口已按服务端 role 门控），兜底提示
        toast.error(tErrors("generic"));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{tInvite("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {invite === null ? (
          <p className="text-sm text-muted-foreground">{tInvite("empty")}</p>
        ) : (
          <>
            <InviteLinkField token={invite.token} />
            <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:gap-6">
              <span>
                {t("createdAt")}: {dateFmt.format(new Date(invite.createdAt))}
              </span>
              <span>
                {t("expiresAt")}: {dateFmt.format(new Date(invite.expiresAt))}
              </span>
            </div>
          </>
        )}
        <div>
          <Button size="sm" onClick={handleGenerate} disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : invite === null ? (
              <Link2 className="size-4" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            {invite === null ? tInvite("generate") : tInvite("regenerate")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
