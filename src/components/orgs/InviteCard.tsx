"use client";

import { useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActiveInvite } from "@/lib/api/members";
import type { OrgRole } from "@/lib/api/roles";
import { roleLabel } from "@/lib/role-label";
import { createInvite } from "@/lib/actions/organizations";
import InviteLinkField from "@/components/orgs/InviteLinkField";

interface InviteCardProps {
  orgId: string;
  /** 当前组织角色列表（邀请时指定加入后的角色） */
  roles: OrgRole[];
  /** 服务端查出的活跃邀请；null = 无活跃链接 */
  invite: ActiveInvite | null;
}

/**
 * 邀请状态卡片（members.invite 可见）。不持有 token state——
 * 生成/重生成走 createInvite action 后 router.refresh()，
 * 以服务端 get_active_invite 的结果为唯一真源。
 */
export default function InviteCard({ orgId, roles, invite }: InviteCardProps) {
  const t = useTranslations("orgs.inviteCard");
  const tInvite = useTranslations("orgs.invite");
  const tRoles = useTranslations("orgs.roles");
  const tToasts = useTranslations("orgs.toasts");
  const tErrors = useTranslations("orgs.errors");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 默认角色：沿用现有邀请的角色；否则优先自定义角色，其次最小权限的 Viewer
  const [roleId, setRoleId] = useState<string>(
    () =>
      invite?.roleId ??
      roles.find((r) => !r.isSystem)?.id ??
      roles.find((r) => r.isSystem && r.name.toLowerCase() === "viewer")?.id ??
      roles[0]?.id ??
      "",
  );

  const dateFmt = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // 邀请链接上的角色名走本地化（找不到对应角色时回落 RPC 返回的名称）
  const inviteRole =
    invite === null ? undefined : roles.find((r) => r.id === invite.roleId);

  function handleGenerate() {
    if (roleId === "") return;
    startTransition(async () => {
      const result = await createInvite(orgId, roleId);
      if (result.ok) {
        toast.success(tToasts("inviteRegenerated"));
        router.refresh();
      } else {
        toast.error(
          result.errorCode === "invalid_role"
            ? tErrors("invalidRole")
            : tErrors("generic"),
        );
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
                {t("role")}:{" "}
                {inviteRole === undefined
                  ? invite.roleName
                  : roleLabel(inviteRole, tRoles)}
              </span>
              <span>
                {t("createdAt")}: {dateFmt.format(new Date(invite.createdAt))}
              </span>
              <span>
                {t("expiresAt")}: {dateFmt.format(new Date(invite.expiresAt))}
              </span>
            </div>
          </>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex shrink-0 flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">
              {tInvite("roleLabel")}
            </span>
            <Select
              value={roleId}
              onValueChange={setRoleId}
              disabled={isPending || roles.length === 0}
            >
              <SelectTrigger
                size="sm"
                className="w-44 max-w-full"
                aria-label={tInvite("roleLabel")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                position="popper"
                align="start"
                sideOffset={4}
                className="w-(--radix-select-trigger-width) min-w-(--radix-select-trigger-width)"
              >
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {roleLabel(role, tRoles)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleGenerate} disabled={isPending || roleId === ""}>
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
