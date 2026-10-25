"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link2, Loader2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrgRole } from "@/lib/api/roles";
import { roleLabel } from "@/lib/role-label";
import { createInvite } from "@/lib/actions/organizations";
import InviteLinkField from "@/components/orgs/InviteLinkField";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前组织 id（服务端已校验 members.invite，这里仅透传） */
  orgId: string;
  /** 当前组织可选角色（邀请时指定加入后的角色） */
  roles: OrgRole[];
}

/**
 * 生成一次性邀请链接（单活跃链接语义：重新生成即失效旧链接）。
 * 链接展示/复制抽到 InviteLinkField（组织管理页 InviteCard 复用）。
 */
export default function InviteDialog({
  open,
  onOpenChange,
  orgId,
  roles,
}: InviteDialogProps) {
  const t = useTranslations("orgs.invite");
  const tRoles = useTranslations("orgs.roles");
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roleId, setRoleId] = useState<string>(
    () =>
      roles.find((r) => !r.isSystem)?.id ??
      roles.find((r) => r.isSystem && r.name.toLowerCase() === "viewer")?.id ??
      roles[0]?.id ??
      "",
  );

  async function handleGenerate() {
    if (roleId === "") return;
    setLoading(true);
    const result = await createInvite(orgId, roleId);
    setLoading(false);
    if (!result.ok) {
      // not_allowed 理论上不会发生（入口已按服务端权限门控），兜底提示
      setToken(null);
      return;
    }
    setToken(result.token ?? null);
    // 服务端为唯一真源：刷新让组织管理页的 InviteCard 同步新链接
    router.refresh();
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setToken(null);
      setLoading(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">{t("roleLabel")}</Label>
            <Select
              value={roleId}
              onValueChange={setRoleId}
              disabled={loading || roles.length === 0}
            >
              <SelectTrigger id="invite-role" className="w-full">
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

          {token !== null ? (
            <>
              <InviteLinkField token={token} />
              <p className="text-xs text-muted-foreground">{t("roleHint")}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant={token === null ? "default" : "outline"}
            onClick={handleGenerate}
            disabled={loading || roleId === ""}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : token === null ? (
              <Link2 className="size-4" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            {token === null ? t("generate") : t("regenerate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
