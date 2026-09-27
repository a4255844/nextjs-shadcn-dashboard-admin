"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { Check } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getDirection } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "cn";

const LOCALES = [
  { code: "en", label: "English", icon: "us-flag" },
  { code: "zh", label: "中文", icon: "cn-flag" },
  { code: "de", label: "Deutsch", icon: "de-flag" },
  { code: "es", label: "Español", icon: "es-flag" },
  { code: "ar", label: "العربية", icon: "ar-flag" },
] as const satisfies ReadonlyArray<{ code: string; label: string; icon: IconName }>;

type LocaleCode = (typeof LOCALES)[number]["code"];

export default function LocaleSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const current = LOCALES.find((item) => item.code === locale) ?? LOCALES[0];

  function switchLocale(next: LocaleCode) {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <DropdownMenu dir={getDirection(locale)}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 gap-1.5 px-2 font-medium text-muted-foreground hover:text-foreground cursor-pointer",
            isPending && "pointer-events-none opacity-60"
          )}
        >
          <Icon name={current.icon} />
          <span className="text-sm">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {LOCALES.map((item) => (
          <DropdownMenuItem
            key={item.code}
            className="cursor-pointer"
            onClick={() => switchLocale(item.code)}
          >
            <Icon name={item.icon} />
            {item.label}
            {item.code === locale && <Check className="ms-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
