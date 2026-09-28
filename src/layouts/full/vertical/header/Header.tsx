"use client";

import FullLogo from "../../shared/logo/FullLogo";
import Search from "./Search";
import Profile from "./Profile";
import LightDark from "./Light-Dark";
import Notifications from "./Notifications";
import LocaleSwitch from "./LocaleSwitch";
import Customizer from "@/components/customizer/customizer-panel";

const Header = () => {
  return (
    <header className="sticky top-0 z-30 shrink-0">
      <div className="border-b border-border bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70 md:rounded-t-xl">
        <nav>
          <div className="flex h-14 items-center justify-between gap-2 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-1">
              <div className="block lg:hidden">
                <FullLogo />
              </div>

              <div className="hidden sm:block">
                <Search />
              </div>
            </div>

            <div className="flex items-center gap-0 sm:gap-1">
              <LocaleSwitch />
              <Customizer />
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
