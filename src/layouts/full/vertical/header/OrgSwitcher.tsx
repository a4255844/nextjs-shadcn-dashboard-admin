"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  ChevronDown,
  CircleCheck,
  Plus,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { OrgSummary } from "@/lib/api/organizations";
import { setActiveOrganization } from "@/lib/actions/organizations";
import CreateOrgDialog from "@/components/orgs/CreateOrgDialog";
import InviteDialog from "@/components/orgs/InviteDialog";

interface OrgSwitcherProps {
  orgs: OrgSummary[];
  activeOrg: OrgSummary | null;
}

/**
 * Header 组织切换器（Vercel/Linear 风格独立下拉）。
 * orgs/activeOrg 由 (app)/layout.tsx 服务端取数传入（Header 是 client 组件）；
 * role 由服务端算好，客户端只做展示门控。
 */
export default function OrgSwitcher({ orgs, activeOrg }: OrgSwitcherProps) {
  const t = useTranslations("orgs");
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Radix 事件纪律：菜单关闭落定后再开 Dialog，避免关闭动画与
  // Dialog 焦点管理冲突（与 LocaleSwitch 的 50ms 延迟导航同理）
  function openDialogAfterMenuClose(setOpen: (open: boolean) => void) {
    setTimeout(() => setOpen(true), 50);
  }

  function handleSwitch(orgId: string) {
    if (orgId === activeOrg?.id) return;
    startTransition(async () => {
      await setActiveOrganization(orgId);
      // 硬刷新：整棵客户端树重建，彻底清掉所有依赖"当前组织数据"的本地状态
      // （勾选集合、搜索词、已打开弹窗等）。router.refresh() 只换 RSC 数据，
      // client state 会残留上一组织的值。
      // 同时丢掉查询串：表格的 q/status/sort/page 都写在 URL 上，
      // 不丢的话新组织会继承上一组织的筛选条件。
      window.location.replace(window.location.pathname);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 font-medium"
            disabled={isPending}
            aria-label={t("switcher.openAria")}
          >
            <Building2 className="size-4" />
            <span className="max-w-28 truncate sm:max-w-36">
              {activeOrg?.name ?? t("switcher.noOrg")}
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {activeOrg !== null && (
            <DropdownMenuRadioGroup
              value={activeOrg.id}
              onValueChange={handleSwitch}
            >
              {orgs.map((org) => (
                <DropdownMenuRadioItem
                  key={org.id}
                  value={org.id}
                  className="gap-2"
                >
                  <span className="truncate">{org.name}</span>
                  {org.role === "admin" && (
                    <CircleCheck className="ms-auto size-3.5 shrink-0 text-muted-foreground" />
                  )}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => openDialogAfterMenuClose(setCreateOpen)}
          >
            <Plus className="size-4" />
            {t("create.title")}
          </DropdownMenuItem>
          {activeOrg?.role === "admin" && (
            <DropdownMenuItem
              onSelect={() => openDialogAfterMenuClose(setInviteOpen)}
            >
              <UserPlus className="size-4" />
              {t("invite.title")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
      {activeOrg !== null && (
        <InviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          orgId={activeOrg.id}
        />
      )}
    </>
  );
}
