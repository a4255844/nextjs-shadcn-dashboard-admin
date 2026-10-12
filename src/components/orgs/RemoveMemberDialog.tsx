"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { MemberRow } from "@/lib/api/members";
import { removeMember } from "@/lib/actions/members";
import { displayName } from "@/components/orgs/MembersTable";

interface RemoveMemberDialogProps {
  orgId: string;
  /** 目标成员；null = 关闭 */
  target: MemberRow | null;
  onClose: () => void;
}

export default function RemoveMemberDialog({
  orgId,
  target,
  onClose,
}: RemoveMemberDialogProps) {
  const t = useTranslations("orgs.members.removeDialog");
  const tToasts = useTranslations("orgs.toasts");
  const tErrors = useTranslations("orgs.errors");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function errorText(code: string | undefined): string {
    switch (code) {
      case "last_admin":
        return tErrors("lastAdmin");
      case "not_admin":
        return tErrors("notAdmin");
      case "not_member":
        return tErrors("notMember");
      case "auth_required":
        return tErrors("authRequired");
      default:
        return tErrors("generic");
    }
  }

  function handleConfirm() {
    if (target === null) return;
    startTransition(async () => {
      const result = await removeMember(orgId, target.userId);
      if (result.ok) {
        toast.success(tToasts("memberRemoved"));
        router.refresh();
        onClose();
      } else {
        // 失败时对话框保持打开，错误经 toast 反馈
        toast.error(errorText(result.errorCode));
      }
    });
  }

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", { name: target === null ? "" : displayName(target) })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
          {/* preventDefault 阻止 Action 点击即关闭：等待 action 结果后再关闭 */}
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            {t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
