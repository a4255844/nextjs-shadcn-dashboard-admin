import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import SidebarLayout from "@/layouts/full/vertical/sidebar/Sidebar";
import Header from "@/layouts/full/vertical/header/Header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <SidebarLayout />
      <SidebarInset className="bg-muted/30">
        <Header />
        <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
