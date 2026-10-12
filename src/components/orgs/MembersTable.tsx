"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { MoreHorizontal, UserRoundMinus } from "lucide-react";
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
import { updateMemberRole } from "@/lib/actions/members";
import RemoveMemberDialog from "@/components/orgs/RemoveMemberDialog";

interface MembersTableProps {
  rows: MemberRow[];
  /** 当前组织 id（updateMemberRole/removeMember 入参透传） */
  orgId: string;
  currentUserId: string;
  isAdmin: boolean;
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
  orgId,
  currentUserId,
  isAdmin,
}: MembersTableProps) {
  const t = useTranslations("orgs.members");
  const tToasts = useTranslations("orgs.toasts");
  const tErrors = useTranslations("orgs.errors");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null);

  const dateFmt = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  function errorText(code: string | undefined): string {
    switch (code) {
      case "last_admin":
        return tErrors("lastAdmin");
      case "not_admin":
        return tErrors("notAdmin");
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

  function handleRoleChange(row: MemberRow, role: string) {
    if (role === row.role) return;
    startTransition(async () => {
      const result = await updateMemberRole(orgId, row.userId, role);
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

  return (
    <>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-start">{t("columns.member")}</TableHead>
              <TableHead className="text-start">{t("columns.role")}</TableHead>
              <TableHead className="text-start">{t("columns.joined")}</TableHead>
              {isAdmin && (
                <TableHead className="w-12 text-start">
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isSelf = row.userId === currentUserId;
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
                    <Badge
                      variant="outline"
                      className={
                        row.role === "admin"
                          ? "border-transparent bg-primary/10 text-primary"
                          : "border-transparent bg-muted text-muted-foreground"
                      }
                    >
                      {row.role === "admin"
                        ? t("roles.admin")
                        : t("roles.member")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dateFmt.format(new Date(row.joinedAt))}
                  </TableCell>
                  {isAdmin && (
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
                              value={row.role}
                              onValueChange={(role) => handleRoleChange(row, role)}
                            >
                              <DropdownMenuRadioItem value="admin">
                                {t("roles.admin")}
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="member">
                                {t("roles.member")}
                              </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
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
    </>
  );
}
