"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

interface OptionCardProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  /** vertical：图标在上、文字在下（风格选择）；horizontal：图标在左、文字在右（明暗/方向等） */
  layout?: "vertical" | "horizontal";
  onSelect?: () => void;
}

// Customizer 中的通用选项卡片
export default function OptionCard({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  layout = "vertical",
  onSelect,
}: OptionCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border border-border bg-background text-muted-foreground transition-colors",
        "hover:border-foreground/30 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        layout === "vertical"
          ? "flex-col px-2 py-4"
          : "flex-row px-4 py-3.5",
        active && "border-foreground/70 bg-muted text-foreground",
        disabled &&
          "cursor-not-allowed opacity-50 hover:border-border hover:text-muted-foreground"
      )}
    >
      <Icon
        className={layout === "vertical" ? "size-6" : "size-5"}
        strokeWidth={1.5}
      />
      <span
        className={cn(
          "whitespace-nowrap",
          layout === "vertical" ? "text-xs" : "text-sm font-normal"
        )}
      >
        {label}
      </span>
    </button>
  );
}
