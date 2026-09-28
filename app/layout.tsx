import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CUSTOMIZER_INIT_SCRIPT } from "@/components/customizer/customizer-init";
import "./globals.css";

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

/**
 * 根 layout：唯一的 <html>/<body> 宿主。
 * 保持静态（不读 headers/cookies），因此各 locale 页面仍可静态生成；
 * 根 layout 不随 [locale] 段切换而重挂，防闪烁 <script> 放这里只会随首屏文档执行一次，
 * 不会在客户端切语言时触发 React 的 script 标签警告。
 * 初始 lang/dir 为默认值，head 脚本会在首次绘制前按 URL 中的 locale 校正。
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      dir="ltr"
      data-style="vega"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 在首屏绘制前恢复 customizer 设置，防止主题闪烁 */}
        <script
          dangerouslySetInnerHTML={{ __html: CUSTOMIZER_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
