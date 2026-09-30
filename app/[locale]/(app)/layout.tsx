import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import SidebarLayout from "@/layouts/full/vertical/sidebar/Sidebar";
import Header from "@/layouts/full/vertical/header/Header";
import { getCurrentUser } from "@/lib/api/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // proxy 已保证进入此布局时必有登录会话；此处取用户信息展示用
  const user = await getCurrentUser();

  return (
    <SidebarProvider>
      <SidebarLayout />
      <SidebarInset className="bg-muted/30">
        <Header user={user} />
        <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
