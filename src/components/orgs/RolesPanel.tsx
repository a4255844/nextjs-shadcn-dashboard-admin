"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { PERMISSION_GROUPS, groupPermissionKeys } from "@/lib/permissions";
import type { OrgRole } from "@/lib/api/roles";
import { roleLabel } from "@/lib/role-label";
import { deleteRole } from "@/lib/actions/roles";
import RoleFormDialog from "@/components/orgs/RoleFormDialog";

interface RolesPanelProps {
  orgId: string;
  roles: OrgRole[];
  /** members.manage 权限：无权限时只读（不渲染新建/编辑/删除入口） */
  canManage: boolean;
}

/**
 * 角色与权限面板（组织管理页）。
 * 固定角色（Admin/Manager/Sales/Viewer）不可删除但权限可改；自定义角色可自由增删改。
 */
export default function RolesPanel({
  orgId,
  roles,
  canManage,
}: RolesPanelProps) {
  const t = useTranslations("orgs.roles");
  const tErrors = useTranslations("orgs.errors");
  const tToasts = useTranslations("orgs.toasts");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  // undefined = 新建；OrgRole = 编辑该角色（同时作为 Dialog 的 key 触发重挂载）
  const [editing, setEditing] = useState<OrgRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrgRole | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(role: OrgRole) {
    setEditing(role);
    setFormOpen(true);
  }

  function handleSaved() {
    router.refresh();
  }

  function handleDelete() {
    if (deleteTarget === null) return;
    startTransition(async () => {
      const result = await deleteRole(deleteTarget.id);
      if (result.ok) {
        toast.success(tToasts("roleDeleted"));
        setDeleteTarget(null);
        router.refresh();
        return;
      }
      switch (result.errorCode) {
        case "role_in_use":
          toast.error(tErrors("roleInUse"));
          break;
        case "system_role":
          toast.error(tErrors("systemRole"));
          break;
        case "not_allowed":
          toast.error(tErrors("notAllowed"));
          break;
        default:
          toast.error(tErrors("generic"));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {canManage && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              {t("create")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {roles.map((role) => {
          const modules = PERMISSION_GROUPS.filter((group) =>
            groupPermissionKeys(group).some((key) =>
              role.permissions.includes(key),
            ),
          );
          return (
            <div
              key={role.id}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {roleLabel(role, t)}
                  </span>
                  {role.isSystem && (
                    <Badge
                      variant="outline"
                      className="border-transparent bg-primary/10 text-primary"
                    >
                      <ShieldCheck className="size-3" />
                      {t("systemBadge")}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {t("permissionCount", { count: role.permissions.length })}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {modules.map((group) => (
                    <Badge key={group.module} variant="secondary" className="font-normal">
                      {t(`modules.${group.module}`)}
                    </Badge>
                  ))}
                </div>
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(role)}
                    disabled={isPending}
                  >
                    <Pencil className="size-3.5" />
                    {t("edit")}
                  </Button>
                  {!role.isSystem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(role)}
                      disabled={isPending}
                    >
                      <Trash2 className="size-3.5" />
                      {t("delete")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <KeyRound className="size-3.5" />
          {t("hint")}
        </p>
      </CardContent>

      {canManage && (
        <RoleFormDialog
          key={editing?.id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          orgId={orgId}
          role={editing}
          onSaved={handleSaved}
        />
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description", {
                name: deleteTarget === null ? "" : roleLabel(deleteTarget, t),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("deleteDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
