"use client";

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, Mailbox, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "cn";
import { profileDD } from "./data";
import { Link } from "@/i18n/navigation";

export default function ProfileSheet() {
  const t = useTranslations("header.profile");

  return (
    <Sheet>
      {/* Trigger Button */}
      <SheetTrigger className="cursor-pointer hover:bg-primary/5 flex items-center justify-center rounded-full h-10 w-10">
        <Avatar className="h-8 w-8">
          <AvatarImage src="/images/profile/avtar.webp" alt="profile" />
          <AvatarFallback>CM</AvatarFallback>
        </Avatar>
      </SheetTrigger>

      {/* Drawer Panel */}
      <SheetContent
        showCloseButton={false}
        side="right"
        className="border-s-0 w-full sm:max-w-80 max-w-60"
      >
        <SheetClose className="absolute top-5 end-5 p-2 hover:bg-primary/5 hover:text-primary rounded-full">
          <X width={20} height={20} />
        </SheetClose>
        {/* Top Profile Section */}
        <div className="p-6 py-6">
          <div className="flex flex-col gap-4 justify-center items-center pt-10">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src="/images/profile/avtar.webp"
                alt="Profile"
              />
              <AvatarFallback>CM</AvatarFallback>
            </Avatar>

            <div className="text-center">
              <h6 className="text-lg font-semibold">Cameron</h6>
              <div className="flex items-center gap-2 justify-center">
                <Mailbox size={18} className="text-muted-foreground" />
                <span className="text-sm font-normal text-muted-foreground">
                  cameron@demo.dev
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu List */}
        <div className="border-t border-border">
          <ul className="flex flex-col gap-2 p-6">
            {profileDD.map((item) => (
              <li key={item.titleKey} className="group">
                <Link
                  href={item.href}
                  className={cn(
                    "flex gap-3 py-2 px-3 rounded-md group-hover:bg-primary/5 text-muted-foreground"
                  )}
                >
                  <item.avatar
                    width={20}
                    height={20}
                    className="group-hover:text-primary"
                  />
                  <h6 className="text-sm group-hover:text-primary">
                    {t(item.titleKey)}
                  </h6>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <SheetFooter className="px-0 pb-6">
          <div className="border-t border-border w-full pt-6 px-6">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/">
                <LogOut className="size-4" />
                {t("logOut")}
              </Link>
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
