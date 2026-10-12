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

  return (
    <SidebarProvider>
      <SidebarLayout />
      <SidebarInset className="bg-muted/30">
        <Header user={user} orgs={orgs} activeOrg={activeOrg} />
        <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
