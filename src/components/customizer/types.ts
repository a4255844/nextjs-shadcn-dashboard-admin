import type { LucideIcon } from "lucide-react";
import {
  Square,
  AppWindow,
  Circle,
  Hexagon,
  Diamond,
  Ellipse,
  RectangleHorizontal,
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

// Customizer 的全部设置；后续模块（明暗/方向/主题色/布局/容器）在此扩展
export interface CustomizerSettings {
  style: ThemeStyle;
}

export const DEFAULT_SETTINGS: CustomizerSettings = {
  style: "vega",
};

// localStorage 持久化 key
export const STORAGE_KEY = "dashboard-customizer";

export interface StyleOption {
  key: ThemeStyle;
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
