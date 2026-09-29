import { LayoutDashboard } from "lucide-react";
import { Link } from "@/i18n/navigation";

const FullLogo = () => {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 overflow-hidden max-w-[40px] lg:max-w-[200px]"
    >
      {/* 图标块：颜色跟随当前主题色（--primary），深浅模式与色板自动适配 */}
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <LayoutDashboard className="size-5" strokeWidth={2.25} />
      </span>
      {/* 品牌字标：窄屏只露出图标块，lg 以上显示完整文字 */}
      <span className="hidden whitespace-nowrap text-lg font-semibold tracking-tight text-foreground lg:inline">
        Dash<span className="text-primary">board</span>
      </span>
    </Link>
  );
};

export default FullLogo;
