// 堆叠柱状图数据点（单个日期三个团队的销售额，单位 k）
export type TeamSalesPoint = {
  date: string;
  teamA: number;
  teamB: number;
  teamC: number;
};

// 销售分布渠道：key 即 ecommerce.salesDistribution.channels 下的 i18n key
export type ChannelKey = "website" | "marketplace" | "affiliate";

export type Channel = {
  key: ChannelKey;
  /** 金额（mock，等后端接入后替换） */
  amount: string;
  /** 环比涨幅（mock） */
  change: string;
  /** 在刻度环中的占比 0-1 */
  share: number;
};

// Key Insights 区域图例：key 即 ecommerce.keyInsights.regions 下的 i18n key
export type RegionKey = "asia" | "usa" | "europe";
