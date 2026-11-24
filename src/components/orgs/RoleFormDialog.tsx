"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PermissionKey } from "@/lib/permissions";
import PermissionTree from "@/components/orgs/PermissionTree";
import type { OrgRole } from "@/lib/api/roles";
import { createRole, updateRole } from "@/lib/actions/roles";

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  /** null = 新建；非 null = 编辑该自定义角色 */
  role: OrgRole | null;
  /** 保存成功回调（父级负责 router.refresh） */
  onSaved: (isEdit: boolean) => void;
}

/**
 * 角色创建/编辑弹窗：名称 + 权限树（模块级全选）。
 * 权限树以 PERMISSION_GROUPS 为唯一真源，勾选结果以数组提交给 Server Action。
 */
export default function RoleFormDialog({
  open,
  onOpenChange,
  orgId,
  role,
  onSaved,
}: RoleFormDialogProps) {
  const t = useTranslations("orgs.roles.form");
  const tErrors = useTranslations("orgs.errors");
  const tToasts = useTranslations("orgs.toasts");

  // 固定系统角色：名称锁定，只能调整权限
  const isSystemRole = role?.isSystem === true;

  const [name, setName] = useState(role?.name ?? "");
  const [selected, setSelected] = useState<PermissionKey[]>(
    role?.permissions ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      // 关闭即重置，避免二次打开残留（切换目标时父级用 key 重挂载兜底）
      setName(role?.name ?? "");
      setSelected(role?.permissions ?? []);
      setError(null);
      setSubmitting(false);
    }
    onOpenChange(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "" || trimmed.length > 40) {
      setError(t("errorName"));
      return;
    }
    if (selected.length === 0) {
      setError(t("noPermission"));
      return;
    }

    setSubmitting(true);
    setError(null);
    const result =
      role === null
        ? await createRole(orgId, trimmed, selected)
        : await updateRole(role.id, trimmed, selected);
    setSubmitting(false);

    if (!result.ok) {
      switch (result.errorCode) {
        case "invalid_name":
          setError(t("errorName"));
          break;
        case "role_name_taken":
          setError(t("errorTaken"));
          break;
        case "invalid_permission":
          setError(t("noPermission"));
          break;
        case "last_admin":
          setError(tErrors("lastAdmin"));
          break;
        case "not_allowed":
          setError(tErrors("notAllowed"));
          break;
        default:
          setError(tErrors("generic"));
      }
      return;
    }

    toast.success(role === null ? tToasts("roleCreated") : tToasts("roleSaved"));
    onSaved(role !== null);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {role === null ? t("createTitle") : t("editTitle")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="flex flex-col gap-2">
            <Label htmlFor="role-name">{t("nameLabel")}</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              maxLength={40}
              autoFocus
              disabled={submitting || isSystemRole}
            />
            {isSystemRole && (
              <p className="text-xs text-muted-foreground">
                {t("systemNameHint")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("permissionsLabel")}</Label>
            <PermissionTree
              selected={selected}
              onChange={setSelected}
              className="flex-1 min-h-0 overflow-y-auto"
            />
          </div>

          {error !== null && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-auto mx-0 mb-0 rounded-b-none border-t bg-muted/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {role === null ? t("submitCreate") : t("submitSave")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
