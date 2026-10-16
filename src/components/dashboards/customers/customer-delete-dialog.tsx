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
import { removeCustomer } from "@/lib/actions/customers";
import type { CustomerRow } from "./types";

interface CustomerDeleteDialogProps {
  orgId: string;
  /** 目标客户；null = 关闭 */
  target: CustomerRow | null;
  onClose: () => void;
}

export default function CustomerDeleteDialog({
  orgId,
  target,
  onClose,
}: CustomerDeleteDialogProps) {
  const t = useTranslations("customers.deleteDialog");
  const tForm = useTranslations("customers.form");
  const tToasts = useTranslations("customers.toasts");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (target === null) return;
    startTransition(async () => {
      const result = await removeCustomer(orgId, target.id);
      if (result.ok) {
        toast.success(tToasts("deleted"));
        router.refresh();
        onClose();
      } else {
        // 失败时对话框保持打开，错误经 toast 反馈
        const code =
          result.errorCode === "forbidden" || result.errorCode === "not_found"
            ? result.errorCode
            : "generic";
        toast.error(tForm(`errors.${code}`));
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
            {t("description", { name: target === null ? "" : target.name })}
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
