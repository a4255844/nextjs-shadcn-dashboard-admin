"use client";

import { useTranslations } from "next-intl";
import { Settings, X } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import OptionCard from "./option-card";
import ColorSwatch from "./color-swatch";
import {
  COLOR_OPTIONS,
  DIRECTION_OPTIONS,
  MODE_OPTIONS,
  STYLE_OPTIONS,
} from "./types";
import { useCustomizer } from "./customizer-context";

// Customizer 抽屉：Header 齿轮触发，右侧滑出。
// 后续模块（布局/容器）在各 section 之后继续追加。
export default function Customizer() {
  // 国际化文案（messages/*.json 的 customizer 命名空间）
  const t = useTranslations("customizer");
  // 全局设置状态：settings 为当前值，resolvedDirection 为语言回退后的实际方向
  const {
    settings,
    resolvedDirection,
    setStyle,
    setMode,
    setDirection,
    setColor,
  } = useCustomizer();

  return (
    // Sheet 根组件：管理抽屉开合状态（Radix Dialog 封装）
    <Sheet>
      {/* 触发器：Header 中的齿轮按钮，asChild 让 Button 直接作为触发节点 */}
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 w-10 rounded-full hover:bg-primary/5 cursor-pointer"
          aria-label={t("title")}
        >
          {/* 齿轮匀速自转；motion-safe 保证用户开启"减少动态"时不转 */}
          <Settings className="size-5 motion-safe:animate-[spin_5s_linear_infinite]" />
        </Button>
      </SheetTrigger>

      {/* 抽屉面板：右侧滑出，隐藏默认关闭按钮（用下方自定义圆形按钮替代） */}
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[380px] gap-0 p-0 sm:max-w-[420px]"
      >
        {/* 顶部：标题 + 副标题 + 自定义关闭按钮 */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex flex-col gap-1">
            <SheetTitle className="text-xl font-semibold">
              {t("title")}
            </SheetTitle>
            <SheetDescription>{t("subtitle")}</SheetDescription>
          </div>
          {/* SheetClose asChild：点击该按钮即关闭抽屉 */}
          <SheetClose asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0 rounded-full"
              aria-label={t("close")}
            >
              <X className="size-5" />
            </Button>
          </SheetClose>
        </div>

        {/* 主体：可滚动区域，容纳所有设置分区 */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* 分区一：主题风格（圆角/描边体系），4 列竖向卡片 */}
          <section className="flex flex-col gap-4">
            <h3 className="text-base font-semibold text-foreground">
              {t("sections.style")}
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {STYLE_OPTIONS.map(({ key, icon }) => (
                <OptionCard
                  key={key}
                  icon={icon}
                  label={t(`styles.${key}`)}
                  active={settings.style === key}
                  onSelect={() => setStyle(key)}
                />
              ))}
            </div>
          </section>

          {/* 分区二：明暗模式，2 列横向卡片 */}
          <section className="mt-8 flex flex-col gap-4">
            <h3 className="text-base font-semibold text-foreground">
              {t("sections.mode")}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {MODE_OPTIONS.map(({ key, icon }) => (
                <OptionCard
                  key={key}
                  icon={icon}
                  label={t(`modes.${key}`)}
                  layout="horizontal"
                  active={settings.mode === key}
                  onSelect={() => setMode(key)}
                />
              ))}
            </div>
          </section>

          {/* 分区三：文本方向；active 用 resolvedDirection（跟随 locale 时也能正确高亮） */}
          <section className="mt-8 flex flex-col gap-4">
            <h3 className="text-base font-semibold text-foreground">
              {t("sections.direction")}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {DIRECTION_OPTIONS.map(({ key, icon }) => (
                <OptionCard
                  key={key}
                  icon={icon}
                  label={t(`directions.${key}`)}
                  layout="horizontal"
                  active={resolvedDirection === key}
                  onSelect={() => setDirection(key)}
                />
              ))}
            </div>
          </section>

          {/* 分区四：主题色板，6 列圆形色块；勾选标记颜色随底色深浅切换 */}
          <section className="mt-8 flex flex-col gap-4">
            <h3 className="text-base font-semibold text-foreground">
              {t("sections.color")}
            </h3>
            <div className="grid grid-cols-6 gap-2.5">
              {COLOR_OPTIONS.map((option) => (
                <ColorSwatch
                  key={option.key}
                  swatch={option.swatch}
                  label={t(`colors.${option.key}`)}
                  active={settings.color === option.key}
                  darkCheck={option.darkCheck}
                  onSelect={() => setColor(option.key)}
                />
              ))}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
