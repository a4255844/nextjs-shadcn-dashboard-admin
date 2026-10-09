import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// locale 根路径（如 /zh、/en）不设独立页面，统一进入该语言的 dashboard；
// 未登录时由 proxy 拦截 /dashboard 并跳转登录页。
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  redirect({ href: "/dashboard", locale });
}
