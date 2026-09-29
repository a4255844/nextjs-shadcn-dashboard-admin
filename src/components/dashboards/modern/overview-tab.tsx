'use client'
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarDays, RefreshCcw, Download, Sun, Moon } from 'lucide-react';

// 问候语只存 key，展示时再翻译，避免用英文文案做逻辑判断
type GreetingKey = 'morning' | 'afternoon' | 'evening' | 'night';

export default function OverviewTab() {
  const t = useTranslations('dashboard');
  const [greeting, setGreeting] = useState<GreetingKey | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      setGreeting('morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('afternoon');
    } else if (hour >= 17 && hour < 21) {
      setGreeting('evening');
    } else {
      setGreeting('night');
    }
  }, []);

  const getGreetingIcon = () => {
    if (greeting === 'morning' || greeting === 'afternoon') {
      return <Sun size={25} color="orange" />;
    } else {
      return <Moon size={25} />;
    }
  };

  const dropdownItems = ['monthly', 'yearly'] as const;
  const [selectedYear, setSelectedYear] = useState<(typeof dropdownItems)[number]>(dropdownItems[0]);

  return (
    <>
      <div className="flex items-center flex-wrap lg:flex-nowrap lg:gap-0 gap-4 justify-between">
        <div className='flex flex-col items-start'>
          <h2 className="text-xl flex item-center gap-2">
            {greeting && t(`greeting.${greeting}`)}, Cameron <span className="flex items-center">{getGreetingIcon()}</span>
          </h2>
          <p className='text-sm font-normal text-muted-foreground'>{t('subtitle')}</p>
        </div>
        <div className="flex items-center lg:flex-nowrap flex-wrap gap-2">
          <Button variant="outline" size="icon" aria-label={t('refresh')}>
            <RefreshCcw size={16} />
          </Button>
          <Select value={selectedYear} onValueChange={(value) => value && setSelectedYear(value as (typeof dropdownItems)[number])}>
            <SelectTrigger className="w-fit gap-2">
              <CalendarDays size={16} className="text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              position="popper"
              align="start"
              sideOffset={4}
              className="rounded-md shadow-md"
            >
              {dropdownItems.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`periods.${item}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="gap-2 px-4">
            <Download size={16} />
            <span className="text-sm font-medium">{t('export')}</span>
          </Button>
        </div>
      </div>
    </>
  );
}
