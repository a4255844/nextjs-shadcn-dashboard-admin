"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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

interface BatchDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 待删除行数（用于确认文案） */
  count: number;
  /** 待删除行 id（勾选的行） */
  ids: string[];
  orgId: string;
  actionFn: (
    orgId: string,
    ids: string[],
  ) => Promise<
    { ok: true; deleted: number } | { ok: false; errorCode: "forbidden" | "not_found" | "network" }
  >;
  /** 文案命名空间（如 "customers" / "pages.orders"），读取 table.batchDelete.* 与 toasts.deletedMany */
  tNamespace: string;
  /** 追加提示（如客户级联删除订单） */
  note?: string;
  /** 删除成功后回调（清空勾选） */
  onDeleted: () => void;
}

export default function BatchDeleteDialog({
  open,
  onOpenChange,
  count,
  ids,
  orgId,
  actionFn,
  tNamespace,
  note,
  onDeleted,
}: BatchDeleteDialogProps) {
  const t = useTranslations(tNamespace);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm(e: React.MouseEvent) {
    // preventDefault 阻止 Action 点击即关闭：等待 action 结果后再关闭
    e.preventDefault();
    if (ids.length === 0) return;

    setSubmitting(true);
    const result = await actionFn(orgId, ids);
    setSubmitting(false);

    if (!result.ok) {
      const code =
        result.errorCode === "not_found"
          ? "notFound"
          : result.errorCode === "forbidden"
            ? "forbidden"
            : "generic";
      toast.error(t(`table.batchDelete.errors.${code}`));
      return;
    }

    toast.success(t("toasts.deletedMany", { count: result.deleted }));
    onDeleted();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("table.batchDelete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("table.batchDelete.description", { count })}
            {note !== undefined && (
              <span className="mt-2 block text-destructive">{note}</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>
            {t("table.batchDelete.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={submitting}
            onClick={handleConfirm}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t("table.batchDelete.confirm", { count })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
