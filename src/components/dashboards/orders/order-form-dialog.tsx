"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createOrder,
  updateOrder,
  type OrderField,
  type OrderFieldErrorCode,
  type OrderFormInput,
} from "@/lib/actions/orders";
import { ORDER_STATUS_KEYS, type OrderRow } from "./types";
import { validateOrderForm } from "@/lib/validations/order";

interface OrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  order: OrderRow | null;
  customers: { id: string; name: string }[];
}

type FormState = OrderFormInput;

const EMPTY_FORM: FormState = {
  customerId: "",
  amount: "",
  status: "pending",
  paymentMethod: "",
  notes: "",
};

function fromOrder(o: OrderRow): FormState {
  return {
    customerId: o.customerId,
    amount: String(o.amount),
    status: o.status,
    paymentMethod: o.paymentMethod ?? "",
    notes: o.notes ?? "",
  };
}

export default function OrderFormDialog({
  open,
  onOpenChange,
  orgId,
  order,
  customers,
}: OrderFormDialogProps) {
  const t = useTranslations("pages.orders.form");
  const tStatus = useTranslations("pages.orders.table.status");
  const tToasts = useTranslations("pages.orders.toasts");
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<OrderField, OrderFieldErrorCode | "invalidCustomer">>
  >({});
  const [submitting, setSubmitting] = useState(false);

  const isEdit = order !== null;
  const busy = submitting;

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(order === null ? EMPTY_FORM : fromOrder(order));
      setFieldErrors({});
    }
  }

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function clientValidate(): Partial<Record<OrderField, OrderFieldErrorCode | "invalidCustomer">> {
    const result = validateOrderForm(form);
    if (result.ok) {
      if (!result.data.customerId) return { customerId: "required" };
      return {};
    }
    return result.fieldErrors as Partial<Record<OrderField, OrderFieldErrorCode | "invalidCustomer">>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = clientValidate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    const result =
      isEdit
        ? await updateOrder(orgId, order.id, form)
        : await createOrder(orgId, form);

    if (!result.ok) {
      setSubmitting(false);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      } else {
        const code =
          result.errorCode === "forbidden" || result.errorCode === "not_found"
            ? result.errorCode
            : "generic";
        toast.error(t(`errors.${code}`));
      }
      return;
    }

    setSubmitting(false);
    toast.success(isEdit ? tToasts("updated") : tToasts("created"));
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("titleEdit") : t("titleCreate")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {/* 编辑时显示服务端生成的订单号（只读） */}
          {isEdit && (
            <div className="flex flex-col gap-2">
              <Label>{t("fields.number")}</Label>
              <Input value={order.number} readOnly className="bg-muted/50" />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="order-customer">{t("fields.customer")}</Label>
            <Select
              value={form.customerId}
              onValueChange={(v) => update("customerId", v)}
              disabled={submitting}
            >
              <SelectTrigger id="order-customer">
                <SelectValue placeholder={t("placeholders.customer")} />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.customerId !== undefined && (
              <p className="text-sm text-destructive">
                {t(`errors.${fieldErrors.customerId}`)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="order-amount">{t("fields.amount")}</Label>
              <Input
                id="order-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
                placeholder={t("placeholders.amount")}
                disabled={submitting}
                aria-invalid={fieldErrors.amount !== undefined}
                dir="ltr"
              />
              {fieldErrors.amount !== undefined && (
                <p className="text-sm text-destructive">
                  {t(`errors.${fieldErrors.amount}`)}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="order-status">{t("fields.status")}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => update("status", v)}
                disabled={submitting}
              >
                <SelectTrigger id="order-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  {ORDER_STATUS_KEYS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {tStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.status !== undefined && (
                <p className="text-sm text-destructive">
                  {t(`errors.${fieldErrors.status}`)}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="order-payment">{t("fields.paymentMethod")}</Label>
            <Input
              id="order-payment"
              value={form.paymentMethod}
              onChange={(e) => update("paymentMethod", e.target.value)}
              placeholder={t("placeholders.paymentMethod")}
              maxLength={50}
              disabled={submitting}
              aria-invalid={fieldErrors.paymentMethod !== undefined}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="order-notes">{t("fields.notes")}</Label>
            <Textarea
              id="order-notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder={t("placeholders.notes")}
              maxLength={1000}
              rows={3}
              disabled={submitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? t("save") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
