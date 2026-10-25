'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarDays, RefreshCcw, Download, Sun, Moon } from 'lucide-react';
import { useGreetingKey } from '@/hooks/use-greeting-key';
import type { DashboardRange } from './types';

interface OverviewTabProps {
  /** 当前用户显示名（无 profile 时回落到邮箱前缀） */
  userName: string;
  /** 指标区间，写在 URL 的 range 参数上，由服务端重新聚合 */
  range: DashboardRange;
  /** 导出链接需要限定组织 */
  orgId: string;
}

export default function OverviewTab({ userName, range, orgId }: OverviewTabProps) {
  const t = useTranslations('dashboard');
  const greeting = useGreetingKey();
  const router = useRouter();
  const pathname = usePathname();

  const getGreetingIcon = () => {
    if (greeting === 'morning' || greeting === 'afternoon') {
      return <Sun size={25} color="orange" />;
    } else {
      return <Moon size={25} />;
    }
  };

  const onRangeChange = (value: string) => {
    if (value !== 'month' && value !== 'year') return;
    // Radix Select 关闭动画期间同步导航会打断关闭流程，沿用 50ms 延迟约定
    window.setTimeout(() => {
      const href = value === 'month' ? pathname : `${pathname}?range=${value}`;
      router.replace(href, { scroll: false });
    }, 50);
  };

  return (
    <>
      <div className="flex items-center flex-wrap lg:flex-nowrap lg:gap-0 gap-4 justify-between">
        <div className='flex flex-col items-start'>
          <h2 className="text-xl flex item-center gap-2">
            {greeting && t(`greeting.${greeting}`)}, {userName} <span className="flex items-center">{getGreetingIcon()}</span>
          </h2>
          <p className='text-sm font-normal text-muted-foreground'>{t('subtitle')}</p>
        </div>
        <div className="flex items-center lg:flex-nowrap flex-wrap gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label={t('refresh')}
            className="cursor-pointer"
            onClick={() => router.refresh()}
          >
            <RefreshCcw size={16} />
          </Button>
          <Select value={range} onValueChange={onRangeChange}>
            <SelectTrigger className="w-fit gap-2 cursor-pointer">
              <CalendarDays size={16} className="text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              position="popper"
              align="start"
              sideOffset={4}
              className="rounded-md shadow-md"
            >
              {(['monthly', 'yearly'] as const).map((item) => (
                <SelectItem
                  key={item}
                  value={item === 'monthly' ? 'month' : 'year'}
                  className="cursor-pointer"
                >
                  {t(`periods.${item}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* 原生 <a download> 触发下载：不经过路由过渡，RouteProgress 也不会启动 */}
          <Button asChild className="gap-2 px-4">
            <a href={`/api/export/orders?orgId=${encodeURIComponent(orgId)}`} download>
              <Download size={16} />
              <span className="text-sm font-medium">{t('export')}</span>
            </a>
          </Button>
        </div>
      </div>
    </>
  );
}
