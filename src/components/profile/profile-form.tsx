"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarUploadField } from "@/components/shared/avatar-upload-field";
import {
  updateMyProfile,
  uploadUserAvatar,
  type ProfileFormInput,
  type ProfileField,
  type ProfileFieldErrorCode,
} from "@/lib/actions/profile";
import { validateProfileForm } from "@/lib/validations/profile";
import type { CurrentUser } from "@/lib/api/auth";

interface ProfileFormProps {
  user: CurrentUser;
}

/** 头像缩写：first + last 的首字母，无名字时取 email 首字母 */
function getInitials(user: CurrentUser): string {
  const first = user.firstName?.trim()[0] ?? "";
  const last = user.lastName?.trim()[0] ?? "";
  const initials = `${first}${last}`.toUpperCase();
  if (initials !== "") return initials;
  return (user.email[0] ?? "?").toUpperCase();
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const t = useTranslations("pages.profile");
  const router = useRouter();

  const [form, setForm] = useState<ProfileFormInput>({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    avatarUrl: user.avatarUrl ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ProfileField, ProfileFieldErrorCode>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof ProfileFormInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // 校验规则由 src/lib/validations/profile.ts 的 zod schema 统一定义
  function clientValidate(): Partial<Record<ProfileField, ProfileFieldErrorCode>> {
    const result = validateProfileForm(form);
    if (result.ok) return {};
    return result.fieldErrors as Partial<Record<ProfileField, ProfileFieldErrorCode>>;
  }

  async function handleUploadAvatar(blob: Blob) {
    const fd = new FormData();
    fd.append("file", blob, "avatar.jpg");
    return await uploadUserAvatar(fd);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = clientValidate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    const result = await updateMyProfile(form);
    setSubmitting(false);

    if (result.ok) {
      toast.success(t("toasts.updated"));
      router.refresh();
    } else {
      setFieldErrors(result.fieldErrors);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {/* 头像：整圆可点（共享组件） */}
      <AvatarUploadField
        value={form.avatarUrl === "" ? null : form.avatarUrl}
        fallbackText={getInitials(user)}
        fallbackClassName="bg-muted"
        disabled={submitting}
        upload={handleUploadAvatar}
        labels={{ change: t("avatar.change"), remove: t("avatar.remove") }}
        errorMessages={{
          invalidType: t("errors.invalidType"),
          tooLarge: t("errors.tooLarge"),
          uploadFailed: t("errors.uploadFailed"),
        }}
        onChange={(url) => update("avatarUrl", url ?? "")}
        avatarClassName="size-20"
      />
      {/* 服务端 invalidAvatar 回显 */}
      {fieldErrors.avatar !== undefined && (
        <p className="text-center text-sm text-destructive">
          {t(`errors.${fieldErrors.avatar}`)}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="first-name">{t("fields.firstName")}</Label>
          <Input
            id="first-name"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            aria-invalid={fieldErrors.firstName !== undefined}
          />
          {fieldErrors.firstName !== undefined && (
            <p className="text-sm text-destructive">
              {t(`errors.${fieldErrors.firstName}`)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="last-name">{t("fields.lastName")}</Label>
          <Input
            id="last-name"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
          />
          {fieldErrors.lastName !== undefined && (
            <p className="text-sm text-destructive">
              {t(`errors.${fieldErrors.lastName}`)}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t("fields.email")}</Label>
        <Input
          id="email"
          value={user.email}
          disabled
          dir="ltr"
          className="bg-muted"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {t("actions.save")}
        </Button>
      </div>
    </form>
  );
}
