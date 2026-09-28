"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

interface OptionCardProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

// Customizer 中的通用选项卡片（图标在上、名称在下）
export default function OptionCard({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  onSelect,
}: OptionCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background px-2 py-4 text-muted-foreground transition-colors",
        "hover:border-foreground/30 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active && "border-foreground/70 bg-muted text-foreground",
        disabled &&
          "cursor-not-allowed opacity-50 hover:border-border hover:text-muted-foreground"
      )}
    >
      <Icon className="size-6" strokeWidth={1.5} />
      <span className="text-xs font-normal whitespace-nowrap">{label}</span>
    </button>
  );
}
