"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { KeyRound, MoreHorizontal, UserRoundMinus } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MemberRow } from "@/lib/api/members";
import type { OrgRole } from "@/lib/api/roles";
import { updateMemberRole } from "@/lib/actions/members";
import { roleLabel } from "@/lib/role-label";
import RemoveMemberDialog from "@/components/orgs/RemoveMemberDialog";
import MemberPermissionsDialog from "@/components/orgs/MemberPermissionsDialog";

interface MembersTableProps {
  rows: MemberRow[];
  /** 当前组织可选角色（下拉里的角色项，按组织自定义角色渲染） */
  roles: OrgRole[];
  /** 当前组织 id（updateMemberRole/removeMember 入参透传） */
  orgId: string;
  currentUserId: string;
  /** members.manage 权限（无权限时只读：不渲染操作列） */
  canManage: boolean;
}

/** 展示名：姓名优先，缺失回落邮箱（RemoveMemberDialog 共用） */
export function displayName(member: MemberRow): string {
  const name = [member.firstName, member.lastName]
    .filter((p): p is string => p !== null && p.trim() !== "")
    .join(" ")
    .trim();
  return name !== "" ? name : member.email;
}

/** 头像 fallback：姓名首字母（最多 2 个），缺失回落邮箱前 2 字符 */
function initialsOf(member: MemberRow): string {
  const name = [member.firstName, member.lastName]
    .filter((p): p is string => p !== null && p.trim() !== "")
    .join(" ")
    .trim();
  const source = name !== "" ? name : member.email;
  if (source === "") return "?";
  return source
    .split(" ")
    .map((p) => p[0])
    .filter((ch): ch is string => ch !== undefined && ch !== "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function MembersTable({
  rows,
  roles,
  orgId,
  currentUserId,
  canManage,
}: MembersTableProps) {
  const t = useTranslations("orgs.members");
  const tRoles = useTranslations("orgs.roles");
  const tToasts = useTranslations("orgs.toasts");
  const tErrors = useTranslations("orgs.errors");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null);
  const [permissionsTarget, setPermissionsTarget] = useState<MemberRow | null>(
    null,
  );

  const dateFmt = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const roleById = new Map(roles.map((r) => [r.id, r]));
  const systemRoleIds = new Set(roles.filter((r) => r.isSystem).map((r) => r.id));

  function errorText(code: string | undefined): string {
    switch (code) {
      case "last_admin":
        return tErrors("lastAdmin");
      case "not_allowed":
        return tErrors("notAllowed");
      case "not_member":
        return tErrors("notMember");
      case "invalid_role":
        return tErrors("invalidRole");
      case "auth_required":
        return tErrors("authRequired");
      default:
        return tErrors("generic");
    }
  }

  function handleRoleChange(row: MemberRow, roleId: string) {
    if (roleId === row.roleId) return;
    startTransition(async () => {
      const result = await updateMemberRole(orgId, row.userId, roleId);
      if (result.ok) {
        toast.success(tToasts("roleUpdated"));
        router.refresh();
      } else {
        toast.error(errorText(result.errorCode));
      }
    });
  }

  function openRemoveDialog(row: MemberRow) {
    // Radix 纪律：菜单关闭落定后再开 Dialog（与 OrgSwitcher 同理）
    setTimeout(() => setRemoveTarget(row), 50);
  }

  function openPermissionsDialog(row: MemberRow) {
    setTimeout(() => setPermissionsTarget(row), 50);
  }

  const permissionsTargetRole =
    permissionsTarget === null
      ? undefined
      : roleById.get(permissionsTarget.roleId);

  return (
    <>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-start">{t("columns.member")}</TableHead>
              <TableHead className="text-start">{t("columns.role")}</TableHead>
              <TableHead className="text-start">{t("columns.joined")}</TableHead>
              {canManage && (
                <TableHead className="w-12 text-start">
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isSelf = row.userId === currentUserId;
              const role = roleById.get(row.roleId);
              const roleName =
                role === undefined ? row.roleName : roleLabel(role, tRoles);
              const isSystemRole = systemRoleIds.has(row.roleId);
              return (
                <TableRow key={row.userId} aria-busy={isPending}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        {row.avatarUrl !== null && (
                          <AvatarImage src={row.avatarUrl} alt={displayName(row)} />
                        )}
                        <AvatarFallback className="text-xs font-medium">
                          {initialsOf(row)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <span className="truncate">{displayName(row)}</span>
                          {isSelf && (
                            <Badge variant="outline">{t("you")}</Badge>
                          )}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {row.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={
                          isSystemRole
                            ? "border-transparent bg-primary/10 text-primary"
                            : "border-transparent bg-muted text-muted-foreground"
                        }
                      >
                        {roleName}
                      </Badge>
                      {row.extraPermissions.length > 0 && (
                        <Badge
                          variant="outline"
                          className="border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          title={t("extraBadgeTitle", {
                            count: row.extraPermissions.length,
                          })}
                        >
                          {t("extraBadge", {
                            count: row.extraPermissions.length,
                          })}
                        </Badge>
                      )}
                      {row.deniedPermissions.length > 0 && (
                        <Badge
                          variant="outline"
                          className="border-transparent bg-destructive/10 text-destructive"
                          title={t("deniedBadgeTitle", {
                            count: row.deniedPermissions.length,
                          })}
                        >
                          {t("deniedBadge", {
                            count: row.deniedPermissions.length,
                          })}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dateFmt.format(new Date(row.joinedAt))}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      {/* 自己的行不提供角色变更/移除入口（DB 层 last_admin 兜底） */}
                      {isSelf ? null : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              disabled={isPending}
                              aria-label={t("actions.openAria")}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuRadioGroup
                              value={row.roleId}
                              onValueChange={(roleId) => handleRoleChange(row, roleId)}
                            >
                              {roles.map((role) => (
                                <DropdownMenuRadioItem
                                  key={role.id}
                                  value={role.id}
                                >
                                  {roleLabel(role, tRoles)}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => openPermissionsDialog(row)}
                            >
                              <KeyRound className="size-4" />
                              {t("actions.permissions")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => openRemoveDialog(row)}
                            >
                              <UserRoundMinus className="size-4" />
                              {t("removeDialog.title")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <RemoveMemberDialog
        orgId={orgId}
        target={removeTarget}
        onClose={() => setRemoveTarget(null)}
      />

      <MemberPermissionsDialog
        key={permissionsTarget?.userId ?? "closed"}
        orgId={orgId}
        target={permissionsTarget}
        rolePermissions={permissionsTargetRole?.permissions ?? []}
        onClose={() => setPermissionsTarget(null)}
      />
    </>
  );
}
