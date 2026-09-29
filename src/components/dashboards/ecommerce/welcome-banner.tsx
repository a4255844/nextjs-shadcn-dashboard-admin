'use client';

import { useTranslations } from "next-intl";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Button } from "@/components/ui/button";
import { useGreetingKey } from "@/hooks/use-greeting-key";

export default function WelcomeBanner() {
  const t = useTranslations("ecommerce");
  const greeting = useGreetingKey();

  return (
    <DashboardCard className="relative overflow-hidden">
      {/* 装饰圆环（跟随主题色） */}
      <div
        aria-hidden
        className="absolute -end-10 -top-16 h-48 w-48 rounded-full border-[24px] border-primary/10"
      />
      <div
        aria-hidden
        className="absolute end-24 top-10 h-6 w-6 rounded-full bg-primary/15"
      />
      <CardContent className="relative flex items-center justify-between gap-6 py-8 px-6">
        <div className="flex flex-col items-start gap-3">
          <h2 className="text-xl flex items-center gap-2">
            {greeting && t(`greeting.${greeting}`)}, Katrina
            <span className="flex items-center">
              {greeting === "morning" || greeting === "afternoon" ? (
                <Sun size={22} color="orange" />
              ) : (
                <Moon size={22} />
              )}
            </span>
          </h2>
          <p className="text-sm font-normal text-muted-foreground max-w-md">
            {t("subtitle")}
          </p>
          <Button className="gap-1.5 px-4">
            {t("viewReport")}
            <ArrowRight size={16} />
          </Button>
        </div>
      </CardContent>
    </DashboardCard>
  );
}
