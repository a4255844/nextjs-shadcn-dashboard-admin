import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh', 'de', 'es', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always'
});

const RTL_LOCALES = new Set(['ar']);

/** Text direction for a locale, used to set the <html dir> attribute. */
export function getDirection(locale: string): 'rtl' | 'ltr' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}
