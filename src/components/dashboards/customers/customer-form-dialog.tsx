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
import { AvatarUploadField } from "@/components/shared/avatar-upload-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCustomer,
  updateCustomer,
  uploadCustomerAvatar,
  type CustomerField,
  type CustomerFieldErrorCode,
  type CustomerFormInput,
} from "@/lib/actions/customers";
import { STATUS_KEYS, type CustomerRow } from "./types";
import {
  validateCustomerForm,
  CUSTOMER_MAX_TEXT,
  CUSTOMER_MAX_EMAIL,
} from "@/lib/validations/customer";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  /** null = 新建；非 null = 编辑该客户 */
  customer: CustomerRow | null;
}

// 与服务端 CustomerFormInput 同构（action 信任边界的精确入参）
type FormState = CustomerFormInput;

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  company: "",
  status: "active",
  spent: "0",
  avatarUrl: "",
};

function fromCustomer(c: CustomerRow): FormState {
  return {
    name: c.name,
    email: c.email,
    company: c.company,
    status: c.status,
    spent: String(c.spent),
    avatarUrl: c.avatarUrl ?? "",
  };
}

// 校验规则由 src/lib/validations/customer.ts 的 zod schema 统一定义，
// 此处仅做客户端预检（即时反馈）；服务端校验仍是信任边界的唯一真源。

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function CustomerFormDialog({
  open,
  onOpenChange,
  orgId,
  customer,
}: CustomerFormDialogProps) {
  const t = useTranslations("customers.form");
  const tStatus = useTranslations("customers.table.status");
  const tToasts = useTranslations("customers.toasts");
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<CustomerField, CustomerFieldErrorCode>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  const isEdit = customer !== null;
  const busy = submitting;

  // Dialog 每次打开时按模式重置表单（render 阶段调整 state，
  // React 官方推荐模式：https://react.dev/learn/you-might-not-need-an-effect）
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(customer === null ? EMPTY_FORM : fromCustomer(customer));
      setFieldErrors({});
    }
  }

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // 头像上传通道：Blob -> 公开 URL
  async function handleUploadAvatar(blob: Blob) {
    const fd = new FormData();
    fd.append("file", blob, "avatar.jpg");
    return await uploadCustomerAvatar(orgId, fd);
  }

  function clientValidate(): Partial<Record<CustomerField, CustomerFieldErrorCode>> {
    const result = validateCustomerForm(form);
    if (result.ok) return {};
    return result.fieldErrors as Partial<Record<CustomerField, CustomerFieldErrorCode>>;
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
        ? await updateCustomer(orgId, customer.id, form)
        : await createCustomer(orgId, form);

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
          {/* 头像选择器：整圆可点（共享组件，与 profile 页同款） */}
          <AvatarUploadField
            value={form.avatarUrl === "" ? null : form.avatarUrl}
            fallbackText={initials(form.name)}
            fallbackClassName={customer?.avatarColor ?? "bg-muted"}
            disabled={busy}
            upload={handleUploadAvatar}
            labels={{ change: t("avatar.change"), remove: t("avatar.remove") }}
            errorMessages={{
              invalidType: t("errors.invalidType"),
              tooLarge: t("errors.tooLarge"),
              uploadFailed: t("errors.uploadFailed"),
            }}
            onChange={(url) => update("avatarUrl", url ?? "")}
          />
          {/* 服务端 avatarUrl 校验失败（invalidAvatar）的回显通道 */}
          {fieldErrors.avatar !== undefined && (
            <p className="text-center text-sm text-destructive">
              {t(`errors.${fieldErrors.avatar}`)}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="customer-name">{t("fields.name")}</Label>
            <Input
              id="customer-name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder={t("placeholders.name")}
              maxLength={CUSTOMER_MAX_TEXT}
              autoFocus
              disabled={submitting}
              aria-invalid={fieldErrors.name !== undefined}
            />
            {fieldErrors.name !== undefined && (
              <p className="text-sm text-destructive">
                {t(`errors.${fieldErrors.name}`)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="customer-email">{t("fields.email")}</Label>
            <Input
              id="customer-email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder={t("placeholders.email")}
              maxLength={CUSTOMER_MAX_EMAIL}
              disabled={submitting}
              aria-invalid={fieldErrors.email !== undefined}
              dir="ltr"
            />
            {fieldErrors.email !== undefined && (
              <p className="text-sm text-destructive">
                {t(`errors.${fieldErrors.email}`)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="customer-company">{t("fields.company")}</Label>
            <Input
              id="customer-company"
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
              placeholder={t("placeholders.company")}
              maxLength={CUSTOMER_MAX_TEXT}
              disabled={submitting}
              aria-invalid={fieldErrors.company !== undefined}
            />
            {fieldErrors.company !== undefined && (
              <p className="text-sm text-destructive">
                {t(`errors.${fieldErrors.company}`)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="customer-status">{t("fields.status")}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => update("status", v)}
                disabled={submitting}
              >
                <SelectTrigger id="customer-status">
                  <SelectValue />
                </SelectTrigger>
                {/* popper：像语言菜单一样在触发器下方浮层展开（item-aligned 会覆盖触发器且无动画） */}
                <SelectContent position="popper" align="start">
                  {STATUS_KEYS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {tStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="customer-spent">{t("fields.spent")}</Label>
              <Input
                id="customer-spent"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={form.spent}
                onChange={(e) => update("spent", e.target.value)}
                disabled={submitting}
                aria-invalid={fieldErrors.spent !== undefined}
                dir="ltr"
              />
            </div>
          </div>
          {fieldErrors.spent !== undefined && (
            <p className="-mt-2 text-sm text-destructive">
              {t(`errors.${fieldErrors.spent}`)}
            </p>
          )}

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
