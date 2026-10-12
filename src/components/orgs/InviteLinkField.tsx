"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InviteLinkFieldProps {
  token: string;
}

/** 邀请链接展示 + 复制（InviteDialog 弹窗与组织管理页 InviteCard 共用） */
export default function InviteLinkField({ token }: InviteLinkFieldProps) {
  const t = useTranslations("orgs.invite");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/${locale}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // 剪贴板不可用（如非安全上下文），静默失败——链接仍可手动选中复制
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        readOnly
        value={`${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/invite/${token}`}
        dir="ltr"
        className="text-xs"
        onFocus={(e) => e.target.select()}
      />
      <Button
        variant="outline"
        size="icon"
        onClick={handleCopy}
        aria-label={copied ? t("copied") : t("copy")}
      >
        {copied ? (
          <Check className="size-4 text-primary" />
        ) : (
          <Copy className="size-4" />
        )}
      </Button>
    </div>
  );
}
