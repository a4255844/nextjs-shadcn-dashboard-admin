"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PermissionTree from "@/components/orgs/PermissionTree";
import { displayName } from "@/components/orgs/MembersTable";
import type { MemberRow } from "@/lib/api/members";
import type { PermissionKey } from "@/lib/permissions";
import { setMemberPermissionOverrides } from "@/lib/actions/members";

interface MemberPermissionsDialogProps {
  orgId: string;
  /** 目标成员；null = 关闭 */
  target: MemberRow | null;
  /** 目标成员角色自带的权限（取消勾选 = 仅对该成员撤销） */
  rolePermissions: readonly PermissionKey[];
  onClose: () => void;
}

/**
 * 成员权限：在角色权限基础上逐项调整。
 * 提交两个差集——角色之外新增（granted）、角色之内被撤销（denied）。
 * 父级以 key={target.userId} 重挂载，保证切换成员时勾选状态重置。
 */
export default function MemberPermissionsDialog({
  orgId,
  target,
  rolePermissions,
  onClose,
}: MemberPermissionsDialogProps) {
  const t = useTranslations("orgs.members.permissionsDialog");
  const tErrors = useTranslations("orgs.errors");
  const tToasts = useTranslations("orgs.toasts");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<PermissionKey[]>(() =>
    target === null
      ? []
      : [
          ...new Set([
            ...rolePermissions.filter(
              (key) => !target.deniedPermissions.includes(key),
            ),
            ...target.extraPermissions,
          ]),
        ],
  );

  function errorText(code: string | undefined): string {
    switch (code) {
      case "last_admin":
        return tErrors("lastAdmin");
      case "not_allowed":
        return tErrors("notAllowed");
      case "not_member":
        return tErrors("notMember");
      case "invalid_permission":
        return tErrors("invalidPermission");
      case "auth_required":
        return tErrors("authRequired");
      default:
        return tErrors("generic");
    }
  }

  function handleSubmit() {
    if (target === null) return;
    setError(null);
    const granted = selected.filter((key) => !rolePermissions.includes(key));
    const denied = rolePermissions.filter((key) => !selected.includes(key));
    startTransition(async () => {
      const result = await setMemberPermissionOverrides(
        orgId,
        target.userId,
        granted,
        denied,
      );
      if (result.ok) {
        toast.success(tToasts("memberPermissionsSaved"));
        router.refresh();
        onClose();
      } else {
        setError(errorText(result.errorCode));
      }
    });
  }

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { name: target === null ? "" : displayName(target) })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
          <PermissionTree
            selected={selected}
            onChange={setSelected}
            className="flex-1 min-h-0 overflow-y-auto"
          />
          <p className="text-xs text-muted-foreground">{t("overrideHint")}</p>
        </div>

        {error !== null && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="mt-auto mx-0 mb-0 rounded-b-none border-t bg-muted/50">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
