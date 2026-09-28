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

// Customizer 的全部设置；后续模块（主题色/布局/容器）在此扩展
export interface CustomizerSettings {
  style: ThemeStyle;
  mode: ThemeMode;
  /** null = 跟随 locale；显式值覆盖 locale 推导 */
  direction: ThemeDirection | null;
}

export const DEFAULT_SETTINGS: CustomizerSettings = {
  style: "vega",
  mode: "light",
  direction: null,
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
