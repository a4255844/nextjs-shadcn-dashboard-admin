'use client'

import { useTranslations } from 'next-intl';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Bookmark, BriefcaseBusiness, Box, Users, File } from 'lucide-react';
import type { AssetItem } from "./types";

// title 存 i18n key，展示时再翻译；数据将来接后端后同样只返回 key
const assetsData: AssetItem[] = [
  {
    id: 'employees',
    title: 'employees',
    href: '/apps/kanban',
    value: '96',
    icon: Users
  },
  {
    id: 'projects',
    title: 'projects',
    href: '/apps/calendar',
    value: '356',
    icon: File
  },
  {
    id: 'clients',
    title: 'clients',
    href: '/',
    value: '3,650',
    icon: BriefcaseBusiness
  },
  {
    id: 'events',
    title: 'events',
    href: '/',
    value: '86',
    icon: Bookmark
  },
];

type AssetCardProps = {
  title: string;
  href: string;
  value: string | number;
  icon: React.ElementType;
};

function AssetCard({ title, value, icon: Icon }: AssetCardProps) {
  return (
    <div className='flex flex-col justify-between p-6 bg-background'>
      <div className='border border-border rounded-md p-2 w-fit'>
        <Icon width={16} height={16} />
      </div>
      <div>
        <h6 className='text-2xl font-semibold'>{value}</h6>
        <p className='text-sm font-normal'>{title}</p>
      </div>
    </div>
  );
}

export default function TotalAssets() {
  const t = useTranslations('dashboard.assets');

  return (
    <DashboardCard className="flex flex-col gap-0! pb-0!">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <Box size={16} className="text-muted-foreground" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className='h-full! px-0!'>
        <div className='h-full!'>
          <div className='grid grid-cols-2 h-full! gap-px bg-border'>
            {assetsData.map((item) => (
              <AssetCard key={item.id} {...item} title={t(item.title)} />
            ))}
          </div>
        </div>
      </CardContent>
    </DashboardCard>
  );
}
