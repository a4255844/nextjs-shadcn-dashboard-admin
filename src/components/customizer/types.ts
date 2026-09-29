import type { LucideIcon } from "lucide-react";
import {
  Square,
  AppWindow,
  Circle,
  Hexagon,
  Diamond,
  Ellipse,
  RectangleHorizontal,
  Sun,
  Moon,
  AlignLeft,
  AlignRight,
} from "lucide-react";

// 支持的主题风格（对应 globals.css 中的 [data-style="..."] token 块）
export const THEME_STYLES = [
  "vega",
  "nova",
  "maia",
  "lyra",
  "mira",
  "luma",
  "rhea",
] as const;

export type ThemeStyle = (typeof THEME_STYLES)[number];

// 明暗模式
export const THEME_MODES = ["light", "dark"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

// 文本方向；null 表示跟随当前 locale 的默认方向
export const THEME_DIRECTIONS = ["ltr", "rtl"] as const;

export type ThemeDirection = (typeof THEME_DIRECTIONS)[number];

// 主题色板（对应 globals.css 中的 [data-color="..."] 变量块）；default 沿用基础灰
export const THEME_COLORS = [
  "default",
  "blue",
  "indigo",
  "violet",
  "purple",
  "pink",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
] as const;

export type ThemeColor = (typeof THEME_COLORS)[number];

// Customizer 的全部设置；后续模块（布局/容器）在此扩展
export interface CustomizerSettings {
  style: ThemeStyle;
  mode: ThemeMode;
  /** null = 跟随 locale；显式值覆盖 locale 推导 */
  direction: ThemeDirection | null;
  color: ThemeColor;
}

export const DEFAULT_SETTINGS: CustomizerSettings = {
  style: "vega",
  mode: "light",
  direction: null,
  color: "indigo",
};

// localStorage 持久化 key
export const STORAGE_KEY = "dashboard-customizer";

// 旧版明暗切换使用的独立 key，仅用于首次迁移读取
export const LEGACY_THEME_KEY = "theme";

export interface StyleOption {
  key: ThemeStyle;
  icon: LucideIcon;
}

export interface ModeOption {
  key: ThemeMode;
  icon: LucideIcon;
}

export interface DirectionOption {
  key: ThemeDirection;
  icon: LucideIcon;
}

// Theme Style 选项（顺序即截图中的排列顺序）
export const STYLE_OPTIONS: StyleOption[] = [
  { key: "vega", icon: Square },
  { key: "nova", icon: AppWindow },
  { key: "maia", icon: Circle },
  { key: "lyra", icon: Hexagon },
  { key: "mira", icon: Diamond },
  { key: "luma", icon: Ellipse },
  { key: "rhea", icon: RectangleHorizontal },
];

// Theme Option（明暗）选项
export const MODE_OPTIONS: ModeOption[] = [
  { key: "light", icon: Sun },
  { key: "dark", icon: Moon },
];

// Theme Direction（文本方向）选项
export const DIRECTION_OPTIONS: DirectionOption[] = [
  { key: "ltr", icon: AlignLeft },
  { key: "rtl", icon: AlignRight },
];

export interface ColorOption {
  key: ThemeColor;
  /** 抽屉中圆点的展示色（与 light 模式主色一致） */
  swatch: string;
  /** 选中勾的颜色：浅底色（如琥珀）用深色勾，其余用白勾 */
  darkCheck: boolean;
}

// Choose Your Theme Colors 选项；每个色板对应的 light/dark CSS 变量在 globals.css
export const COLOR_OPTIONS: ColorOption[] = [
  { key: "default", swatch: "oklch(0.205 0 0)", darkCheck: false },
  { key: "blue", swatch: "oklch(0.55 0.22 258)", darkCheck: false },
  { key: "indigo", swatch: "oklch(0.52 0.21 275)", darkCheck: false },
  { key: "violet", swatch: "oklch(0.53 0.23 295)", darkCheck: false },
  { key: "purple", swatch: "oklch(0.52 0.22 315)", darkCheck: false },
  { key: "pink", swatch: "oklch(0.57 0.21 350)", darkCheck: false },
  { key: "red", swatch: "oklch(0.56 0.21 25)", darkCheck: false },
  { key: "orange", swatch: "oklch(0.63 0.19 48)", darkCheck: false },
  { key: "amber", swatch: "oklch(0.76 0.16 78)", darkCheck: true },
  { key: "green", swatch: "oklch(0.56 0.17 150)", darkCheck: false },
  { key: "teal", swatch: "oklch(0.55 0.12 195)", darkCheck: false },
];
