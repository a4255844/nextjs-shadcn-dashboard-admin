import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh', 'de', 'es', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
  // 关闭基于 cookie / Accept-Language 的自动检测：
  // 不带 locale 前缀的访问一律重定向到 defaultLocale（en），
  // 语言切换仍由显式 URL 前缀（/zh/...）驱动，不受影响。
  localeDetection: false,
});

const RTL_LOCALES = new Set(['ar']);

/** Text direction for a locale, used to set the <html dir> attribute. */
export function getDirection(locale: string): 'rtl' | 'ltr' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}
