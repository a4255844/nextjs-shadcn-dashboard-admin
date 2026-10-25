import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import SidebarLayout from "@/layouts/full/vertical/sidebar/Sidebar";
import Header from "@/layouts/full/vertical/header/Header";
import { getCurrentUser } from "@/lib/api/auth";
import {
  getActiveOrg,
  listMyOrganizations,
  type OrgSummary,
} from "@/lib/api/organizations";
import { listOrgRoles, type OrgRole } from "@/lib/api/roles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // proxy 已保证进入此布局时必有登录会话；此处取用户信息展示用
  const user = await getCurrentUser();

  // 组织切换器数据：服务端取数（Header 是 client 组件）。
  // getActiveOrg 复用已取的 memberships，避免重复查询
  let orgs: OrgSummary[] = [];
  let activeOrg: OrgSummary | null = null;
  try {
    orgs = await listMyOrganizations();
    activeOrg = await getActiveOrg(orgs);
  } catch {
    // 组织数据获取失败不阻塞整个布局渲染，切换器显示"无组织"态
  }

  // 邀请弹窗的角色选项：仅 members.invite 权限持有者才查（RPC 亦有门控）
  let roles: OrgRole[] = [];
  if (
    activeOrg !== null &&
    activeOrg.permissions.includes("members.invite")
  ) {
    try {
      roles = await listOrgRoles(activeOrg.id);
    } catch {
      // 角色查询失败不影响布局；邀请弹窗将无角色可选（按钮禁用）
    }
  }

  return (
    <SidebarProvider>
      <SidebarLayout permissions={activeOrg?.permissions} />
      <SidebarInset className="bg-muted/30">
        <Header user={user} orgs={orgs} activeOrg={activeOrg} roles={roles} />
        <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
