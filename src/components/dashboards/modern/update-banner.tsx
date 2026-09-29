'use client'
import { useLocale, useTranslations } from 'next-intl';
import { CardContent } from '@/components/ui/card';
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export default function UpdateBanner() {
  const t = useTranslations('dashboard.banner');
  // 日期按当前语言环境格式化，而不是写死 en-US
  const locale = useLocale();

  return (
    <DashboardCard className="py-3">
      <CardContent className="flex items-center flex-wrap justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-chart-1 animate-ping absolute inline-flex" />
            <span className="h-2 w-2 rounded-full bg-chart-1 absolute inline-flex" />
            <p className="text-sm font-medium  ps-4">{t('update')}</p>
            <span className="w-1 h-1 rounded-full bg-border" />
            <p className="text-sm font-normal text-muted-foreground">
              {new Date().toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <p className="text-sm font-normal">
            {t.rich('text', {
              highlight: (chunks) => <span className="text-emerald-600">{chunks}</span>,
            })}
          </p>
        </div>
        <Link href="#">
          <Button variant={'outline'} className="flex gap-1.5 px-4 py-2 h-auto rounded-md cursor-pointer">
            {t('cta')}
            <span>
              <ArrowRight width={18} height={18} />
            </span>
          </Button>
        </Link>
      </CardContent>
    </DashboardCard>
  );
}
