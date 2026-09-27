"use client";

import React from 'react';
import { PanelLeft } from 'lucide-react';
import NavCollapse from './nav-collapse';
import SimpleBar from 'simplebar-react';
import FullLogo from '../../shared/logo/FullLogo';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavUser } from './NavUser';
import { Button } from "@/components/ui/button";
import sidebaritems from './sidebaritems';

const SidebarLayout = ({ ...props }: React.ComponentProps<typeof Sidebar>) => {
  const { toggleSidebar } = useSidebar();

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      {...props}
      className="sidebar-box **:data-[slot=sidebar-inner]:bg-background **:data-[slot=sidebar-inner]:border **:data-[slot=sidebar-inner]:border-border group-data-[state=collapsed]:hover:shadow-xl"
      side="left"
    >
      <SidebarHeader className="flex flex-row items-center justify-between border-b border-border p-3 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-2.5">
        <div className="group-data-[state=collapsed]:hidden">
          <FullLogo />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 cursor-pointer text-muted-foreground hover:bg-primary/5 hover:text-foreground"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={18} />
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SimpleBar style={{ height: "100%" }}>
          <SidebarGroup className="flex items-center justify-center group-data-[state=collapsed]:px-2 px-3 py-4">
            <div className="px-0 group-data-[state=collapsed]:px-0 w-full flex flex-col gap-4">
              <NavCollapse menu={sidebaritems} className="text-sm" />
            </div>
          </SidebarGroup>
        </SimpleBar>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="hide-menu flex flex-col gap-2">
          <NavUser />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default SidebarLayout;
