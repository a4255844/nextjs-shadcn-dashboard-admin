"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { removeOrder } from "@/lib/actions/orders";
import type { OrderRow } from "./types";

interface OrderDeleteDialogProps {
  orgId: string;
  target: OrderRow | null;
  onClose: () => void;
}

export default function OrderDeleteDialog({
  orgId,
  target,
  onClose,
}: OrderDeleteDialogProps) {
  const t = useTranslations("pages.orders.deleteDialog");
  const tToasts = useTranslations("pages.orders.toasts");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const open = target !== null;

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (target === null) return;

    setSubmitting(true);
    const result = await removeOrder(orgId, target.id);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(
        result.errorCode === "forbidden" || result.errorCode === "not_found"
          ? t(`errors.${result.errorCode}`)
          : t("errors.generic"),
      );
      return;
    }

    toast.success(tToasts("deleted"));
    onClose();
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {target !== null && (
              <>
                {t("description", { number: target.number })}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting}
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
