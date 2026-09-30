"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Loader2 } from "lucide-react";

type Mode = "signIn" | "signUp";

const MIN_PASSWORD_LENGTH = 6;

/** 校验登录后回跳路径：必须是站内相对路径，防止 open redirect */
function parseRedirect(v: string | null): string {
  if (v !== null && v.startsWith("/") && !v.startsWith("//")) {
    return v;
  }
  return "/dashboard";
}

export default function LoginForm() {
  const t = useTranslations("login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = parseRedirect(searchParams.get("redirect"));

  const [mode, setMode] = useState<Mode>("signIn");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const supabase = createClient();

    if (mode === "signIn") {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError !== null) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }
    } else {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        // 写入 user_metadata，注册触发器用它填充 profiles 表
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim() === "" ? undefined : lastName.trim(),
          },
        },
      });
      if (authError !== null) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }
      // 邮箱验证开启时：注册成功但没有会话，需要用户先点确认邮件
      if (data.session === null && data.user !== null) {
        setInfo(t("checkEmail", { email }));
        setSubmitting(false);
        return;
      }
    }

    router.push(redirectTo);
    router.refresh();
  }

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  return (
    <DashboardCard className="w-full max-w-sm p-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex flex-col gap-4">
          {mode === "signUp" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName">{t("firstName")}</Label>
                <Input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName">{t("lastName")}</Label>
                <Input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              required
              minLength={MIN_PASSWORD_LENGTH}
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {passwordTooShort && (
              <p className="text-xs text-destructive">
                {t("passwordTooShort", { count: MIN_PASSWORD_LENGTH })}
              </p>
            )}
          </div>

          {info !== null && (
            <p className="text-sm text-primary">{info}</p>
          )}

          {error !== null && (
            <p className="text-sm text-destructive" dir="ltr">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="cursor-pointer">
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {mode === "signIn" ? t("signIn") : t("signUp")}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "signIn" ? t("noAccount") : t("hasAccount")}{" "}
          <button
            type="button"
            className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => {
              setMode(mode === "signIn" ? "signUp" : "signIn");
              setError(null);
            }}
          >
            {mode === "signIn" ? t("switchToSignUp") : t("switchToSignIn")}
          </button>
        </p>
      </form>
    </DashboardCard>
  );
}
