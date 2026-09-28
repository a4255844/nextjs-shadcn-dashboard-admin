"use client";

import { useCustomizer } from "@/components/customizer/customizer-context";

interface Props {
  children: React.ReactNode;
  lyraClassName: string;
  defaultClassName?: string;
}

// 根据当前 Theme Style 选择容器类名：
// lyra 使用 gap-px/bg-border 的细分隔线网格，其余风格使用带间距的卡片网格。
const StyleAwareWrapper = ({
  children,
  lyraClassName,
  defaultClassName,
}: Props) => {
  const { settings } = useCustomizer();

  return (
    <div
      className={
        settings.style === "lyra" ? lyraClassName : defaultClassName
      }
    >
      {children}
    </div>
  );
};

export default StyleAwareWrapper;
