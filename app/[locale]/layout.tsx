import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, getDirection } from "@/i18n/routing";
import { CustomizerProvider } from "@/components/customizer/customizer-context";
import { CUSTOMIZER_INIT_SCRIPT } from "@/components/customizer/customizer-init";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard Next",
  description: "A modern dashboard built with Next.js 16",
};

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

  return (
    <html
      lang={locale}
      dir={getDirection(locale)}
      data-style="vega"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 在首屏绘制前恢复 customizer 设置，防止主题闪烁 */}
        <script dangerouslySetInnerHTML={{ __html: CUSTOMIZER_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <CustomizerProvider>{children}</CustomizerProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
