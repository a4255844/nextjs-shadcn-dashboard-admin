"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PanelLeft } from 'lucide-react';
import { Separator } from "@/components/ui/separator";

import FullLogo from "../../shared/logo/FullLogo";
import Search from "./Search";
import Profile from "./Profile";
import LightDark from "./Light-Dark";
import Notifications from "./Notifications";

const Header = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 md:top-2 z-30 shrink-0 px-0 md:px-2">
      <div className="border-b md:border border-border bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70 md:rounded-xl shadow-sm">
        <nav>
          <div className="mx-auto flex h-14 items-center justify-between gap-2 px-2 sm:px-3">
            <div className="flex min-w-0 items-center gap-1">
              <div className="block lg:hidden">
                <FullLogo />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="p-2 hover:bg-primary/5 rounded-full transition cursor-pointer"
                onClick={toggleSidebar}
                aria-label="Toggle sidebar"
              >
                <PanelLeft size={21} />
              </Button>

              <Separator
                orientation="vertical"
                className="h-4 mr-2 ml-1 w-px bg-border self-center max-lg:hidden"
              />

              <div className="hidden sm:block">
                <Search />
              </div>
            </div>

            <div className="flex items-center gap-0 sm:gap-1">
              <LightDark />
              <Notifications className="hidden sm:block" />
              <Profile />
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
