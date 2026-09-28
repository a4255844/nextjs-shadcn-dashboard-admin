"use client";

import Divider from "./divider";
import { useCustomizer } from "@/components/customizer/customizer-context";

interface Props {
  wrapperClassName?: string;
}

// 点状分隔线仅在 lyra 风格下显示（其他风格靠卡片间距区分区块）。
const StyleDivider = ({ wrapperClassName }: Props) => {
  const { settings } = useCustomizer();

  if (settings.style !== "lyra") return null;

  if (wrapperClassName) {
    return (
      <div className={wrapperClassName}>
        <Divider noContainer />
      </div>
    );
  }
  return <Divider noContainer />;
};

export default StyleDivider;
