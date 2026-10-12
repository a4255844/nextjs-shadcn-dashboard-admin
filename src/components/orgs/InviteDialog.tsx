"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Loader2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInvite } from "@/lib/actions/organizations";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前组织 id（服务端已校验 admin 角色，这里仅透传） */
  orgId: string;
}

/**
 * 生成一次性邀请链接（单活跃链接语义：重新生成即失效旧链接）。
 * 链接用 window.location.origin 拼接，dev/生产环境天然一致。
 */
export default function InviteDialog({
  open,
  onOpenChange,
  orgId,
}: InviteDialogProps) {
  const t = useTranslations("orgs.invite");
  const tErrors = useTranslations("orgs.errors");
  const locale = useLocale();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const result = await createInvite(orgId);
    setLoading(false);
    if (!result.ok) {
      // not_admin 理论上不会发生（入口已按服务端 role 门控），兜底提示
      setToken(null);
      return;
    }
    setToken(result.token ?? null);
    setCopied(false);
  }

  async function handleCopy() {
    if (token === null) return;
    const url = `${window.location.origin}/${locale}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // 剪贴板不可用（如非安全上下文），静默失败——链接仍可手动选中复制
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setToken(null);
      setCopied(false);
      setLoading(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {token !== null ? (
            <>
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
              <p className="text-xs text-muted-foreground">{t("roleHint")}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant={token === null ? "default" : "outline"}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : token === null ? (
              <Link2 className="size-4" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            {token === null ? t("generate") : t("regenerate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
