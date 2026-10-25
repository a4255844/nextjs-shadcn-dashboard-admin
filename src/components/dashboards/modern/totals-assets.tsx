'use client';

import { useLocale, useTranslations } from 'next-intl';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Link } from '@/i18n/navigation';
import { AlertTriangle, Box, Crown, UserMinus, Users } from 'lucide-react';
import type { StatusKey } from "@/components/dashboards/customers/types";
import type { AssetItem } from "./types";

// 客户分群卡片：数值来自服务端聚合，链接直达对应列表/分群页
const assetItems: Omit<AssetItem, "value">[] = [
  { id: 'active', href: '/customers?status=active', icon: Users },
  { id: 'vip', href: '/customers/segments/high-value', icon: Crown },
  { id: 'atRisk', href: '/customers/segments/at-risk', icon: AlertTriangle },
  { id: 'inactive', href: '/customers?status=inactive', icon: UserMinus },
];

type AssetCardProps = {
  title: string;
  href: string;
  value: number;
  icon: React.ElementType;
  format: (value: number) => string;
};

function AssetCard({ title, href, value, icon: Icon, format }: AssetCardProps) {
  return (
    <Link
      href={href}
      className="flex flex-col justify-between p-6 bg-background transition-colors hover:bg-muted/40"
    >
      <div className='border border-border rounded-md p-2 w-fit'>
        <Icon width={16} height={16} />
      </div>
      <div>
        <h6 className='text-2xl font-semibold'>{format(value)}</h6>
        <p className='text-sm font-normal'>{title}</p>
      </div>
    </Link>
  );
}

export default function TotalAssets({ counts }: { counts: Record<StatusKey, number> }) {
  const t = useTranslations('dashboard.assets');
  const locale = useLocale();
  const number = new Intl.NumberFormat(locale);

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
            {assetItems.map((item) => (
              <AssetCard
                key={item.id}
                {...item}
                title={t(`items.${item.id}`)}
                value={counts[item.id]}
                format={(v) => number.format(v)}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </DashboardCard>
  );
}
