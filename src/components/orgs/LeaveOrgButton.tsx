"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { removeMember } from "@/lib/actions/members";

interface LeaveOrgButtonProps {
  orgId: string;
  orgName: string;
  currentUserId: string;
  /** 组织仅剩自己一个 admin 时为 true（教育性提示；实际兜底在 RPC） */
  isLastAdmin: boolean;
}

/** 退出组织（self-leave）：成功后 action 会删除 active-org cookie，
 * 页面随 revalidate 回落到剩余组织或无组织空态 */
export default function LeaveOrgButton({
  orgId,
  orgName,
  currentUserId,
  isLastAdmin,
}: LeaveOrgButtonProps) {
  const t = useTranslations("orgs.leave");
  const tToasts = useTranslations("orgs.toasts");
  const tErrors = useTranslations("orgs.errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function errorText(code: string | undefined): string {
    switch (code) {
      case "last_admin":
        return tErrors("lastAdmin");
      case "not_member":
        return tErrors("notMember");
      case "auth_required":
        return tErrors("authRequired");
      default:
        return tErrors("generic");
    }
  }

  function handleLeave() {
    startTransition(async () => {
      const result = await removeMember(orgId, currentUserId);
      if (result.ok) {
        toast.success(tToasts("left"));
        setOpen(false);
        router.refresh();
      } else {
        // 失败（如 last_admin）时对话框保持打开，错误经 toast 反馈
        toast.error(errorText(result.errorCode));
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-medium">{t("title")}</p>
          {isLastAdmin && (
            <p className="text-xs text-muted-foreground">{t("lastAdminHint")}</p>
          )}
        </div>
        <Button
          variant="outline"
          className="text-destructive sm:shrink-0"
          onClick={() => setOpen(true)}
        >
          <LogOut className="size-4" />
          {t("button")}
        </Button>
      </div>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!isPending) setOpen(next);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogDescription", { orgName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            {/* preventDefault 阻止 Action 点击即关闭：等待 action 结果后再关闭 */}
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleLeave();
              }}
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
