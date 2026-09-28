"use client";

import { useTranslations } from "next-intl";
import { Settings, X } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import OptionCard from "./option-card";
import { STYLE_OPTIONS } from "./types";
import { useCustomizer } from "./customizer-context";

// Customizer 抽屉：Header 齿轮触发，右侧滑出。
// 本期仅包含 Theme Style 分区，后续模块在此追加 section。
export default function Customizer() {
  const t = useTranslations("customizer");
  const { settings, setStyle } = useCustomizer();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 w-10 rounded-full hover:bg-primary/5 cursor-pointer"
          aria-label={t("title")}
        >
          <Settings className="size-5 motion-safe:animate-[spin_5s_linear_infinite]" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[380px] gap-0 p-0 sm:max-w-[420px]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex flex-col gap-1">
            <SheetTitle className="text-xl font-semibold">
              {t("title")}
            </SheetTitle>
            <SheetDescription>{t("subtitle")}</SheetDescription>
          </div>
          <SheetClose asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0 rounded-full"
              aria-label={t("close")}
            >
              <X className="size-5" />
            </Button>
          </SheetClose>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <section className="flex flex-col gap-4">
            <h3 className="text-base font-semibold text-foreground">
              {t("sections.style")}
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {STYLE_OPTIONS.map(({ key, icon }) => (
                <OptionCard
                  key={key}
                  icon={icon}
                  label={t(`styles.${key}`)}
                  active={settings.style === key}
                  onSelect={() => setStyle(key)}
                />
              ))}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
