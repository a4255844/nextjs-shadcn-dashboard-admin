"use client";

import { Check } from "lucide-react";
import { cn } from "cn";

interface ColorSwatchProps {
  /** 圆点底色（CSS 颜色） */
  swatch: string;
  label: string;
  active: boolean;
  /** 浅底色（如琥珀）勾选标记用深色，其余用白色 */
  darkCheck: boolean;
  onSelect: () => void;
}

// Choose Your Theme Colors 的单个圆形色块
export default function ColorSwatch({
  swatch,
  label,
  active,
  darkCheck,
  onSelect,
}: ColorSwatchProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onSelect}
      style={{ backgroundColor: swatch }}
      className={cn(
        "flex aspect-square w-full cursor-pointer items-center justify-center rounded-full transition-shadow",
        active
          ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
          : "ring-1 ring-border hover:ring-foreground/40"
      )}
    >
      {active && (
        <Check
          strokeWidth={3}
          className={cn("size-4", darkCheck ? "text-foreground" : "text-white")}
        />
      )}
    </button>
  );
}
