import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { CustomizerProvider } from "@/components/customizer/customizer-context";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // <html>/<body> 与防闪烁脚本统一在根 app/layout.tsx；
  // 这里只挂与 locale 相关的 providers。
  return (
    <NextIntlClientProvider>
      <CustomizerProvider>{children}</CustomizerProvider>
    </NextIntlClientProvider>
  );
}
