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
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

import { cn } from "cn";
import { profileDD } from "./data";
import { Link } from "@/i18n/navigation";
import type { CurrentUser } from "@/lib/api/auth";

/** 取用于头像/展示的名字：优先 first + last，其次 email @ 前段 */
function getDisplayName(user: CurrentUser): string {
  const parts = [user.firstName?.trim(), user.lastName?.trim()].filter(
    (p): p is string => p !== undefined && p !== "",
  );
  if (parts.length > 0) return parts.join(" ");
  return user.email.split("@")[0] ?? user.email;
}

/** 头像缩写：first + last 的首字母，无名字时取 email 首字母 */
function getInitials(user: CurrentUser): string {
  const first = user.firstName?.trim()[0] ?? "";
  const last = user.lastName?.trim()[0] ?? "";
  const initials = `${first}${last}`.toUpperCase();
  if (initials !== "") return initials;
  return (user.email[0] ?? "?").toUpperCase();
}

export default function ProfileSheet({ user }: { user: CurrentUser | null }) {
  const t = useTranslations("header.profile");
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName = user !== null ? getDisplayName(user) : "";
  const initials = user !== null ? getInitials(user) : "?";

  return (
    <Sheet>
      {/* Trigger Button */}
      <SheetTrigger className="cursor-pointer hover:bg-primary/5 flex items-center justify-center rounded-full h-10 w-10">
        <Avatar className="h-8 w-8">
          {user?.avatarUrl !== null && user?.avatarUrl !== undefined && (
            <AvatarImage src={user.avatarUrl} alt="profile" />
          )}
          <AvatarFallback>{initials}</AvatarFallback>
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
              {user?.avatarUrl !== null && user?.avatarUrl !== undefined && (
                <AvatarImage src={user.avatarUrl} alt="Profile" />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="text-center">
              <h6 className="text-lg font-semibold">{displayName || "?"}</h6>
              {user !== null && (
                <div className="flex items-center gap-2 justify-center">
                  <Mailbox size={18} className="text-muted-foreground" />
                  <span
                    className="text-sm font-normal text-muted-foreground"
                    dir="ltr"
                  >
                    {user.email}
                  </span>
                </div>
              )}
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
            <SheetClose asChild>
              <Button
                variant="outline"
                className="w-full cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                {t("logOut")}
              </Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
