"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocale } from "next-intl";
import { getDirection } from "@/i18n/routing";
import {
  DEFAULT_SETTINGS,
  LEGACY_THEME_KEY,
  STORAGE_KEY,
  THEME_COLORS,
  THEME_DIRECTIONS,
  THEME_MODES,
  THEME_STYLES,
  type CustomizerSettings,
  type ThemeColor,
  type ThemeDirection,
  type ThemeMode,
  type ThemeStyle,
} from "./types";

interface CustomizerContextValue {
  settings: CustomizerSettings;
  /** 是否已从 localStorage 完成恢复（首帧为 false） */
  mounted: boolean;
  /** 实际生效的文本方向：显式设置优先，否则回退当前 locale 推导 */
  resolvedDirection: ThemeDirection;
  setStyle: (style: ThemeStyle) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  /** 设置显式方向；传 null 清除覆盖、回到跟随当前 locale */
  setDirection: (direction: ThemeDirection | null) => void;
  setColor: (color: ThemeColor) => void;
  reset: () => void;
}

const CustomizerContext = createContext<CustomizerContextValue | null>(null);

// 校验"类型体系内"的值（来自 as Partial<Settings>）：排除 undefined，
// 并保留 includes 防御 as 断言与实际存储不符的情况。[]、123 等会编译期标红。
function isStyle(v?: ThemeStyle): v is ThemeStyle {
  return v !== undefined && THEME_STYLES.includes(v);
}

function isMode(v?: ThemeMode): v is ThemeMode {
  return v !== undefined && THEME_MODES.includes(v);
}

// direction 允许 null（跟随 locale），仅在为显式 ltr/rtl 时收窄
function isDirection(v?: ThemeDirection | null): v is ThemeDirection {
  return v !== null && v !== undefined && THEME_DIRECTIONS.includes(v);
}

function isColor(v?: ThemeColor): v is ThemeColor {
  return v !== undefined && THEME_COLORS.includes(v);
}
// 解析 localStorage 取出的任意字符串：合法则收窄为 ThemeMode，否则 null
function parseMode(v: string | null): ThemeMode | null {
  if (v !== null && (THEME_MODES as readonly string[]).includes(v)) {
    return v as ThemeMode; // 已通过运行时成员校验，断言安全
  }
  return null;
}

function loadSettings(): CustomizerSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<CustomizerSettings>) : {};

    // 旧版明暗设置（独立 "theme" key）的一次性迁移
    let mode = DEFAULT_SETTINGS.mode;
    if (isMode(parsed.mode)) {
      mode = parsed.mode;
    } else {
      const legacyMode = parseMode(window.localStorage.getItem(LEGACY_THEME_KEY));
      if (legacyMode) mode = legacyMode;
    }

    return {
      style: isStyle(parsed.style) ? parsed.style : DEFAULT_SETTINGS.style,
      mode,
      direction: isDirection(parsed.direction) ? parsed.direction : null,
      color: isColor(parsed.color) ? parsed.color : DEFAULT_SETTINGS.color,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function CustomizerProvider({ children }: { children: ReactNode }) {
  // 始终以默认值启动，保证 SSR 与首帧一致，避免 hydration mismatch
  const [settings, setSettings] = useState<CustomizerSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);
  // 最新设置的同步引用，供 update 在事件中同步读取/落盘
  const settingsRef = useRef(settings);
  const locale = useLocale();

  // 显式方向优先；为 null 时回退 locale 推导。首帧默认值即 locale 方向，与 SSR 一致
  const resolvedDirection: ThemeDirection =
    settings.direction ?? getDirection(locale);

  // hydration 后读取持久化设置（首屏的 data-style/.dark/dir 已由内联脚本提前写入）
  useEffect(() => {
    const loaded = loadSettings();
    settingsRef.current = loaded;
    setSettings(loaded);
    setMounted(true);
  }, []);

  // 同步到 <html data-style>
  useEffect(() => {
    document.documentElement.dataset.style = settings.style;
  }, [settings.style]);

  // 同步到 <html data-color>
  useEffect(() => {
    document.documentElement.dataset.color = settings.color;
  }, [settings.color]);

  // 同步到 <html class="dark">
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.mode === "dark");
  }, [settings.mode]);

  // 同步到 <html dir>（根 layout 是静态的，初始 dir 由 head 脚本按 URL 校正，这里负责后续更新）
  useEffect(() => {
    document.documentElement.dir = resolvedDirection;
  }, [resolvedDirection]);

  // 同步到 <html lang>（locale 变化时更新；初始值同样由 head 脚本在绘制前设置）
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // 所有变更经 update 一次性"改 state + 落盘"。
  // 必须同步写 localStorage——跨语言切换走的是整页硬导航（proxy 参与），
  // 若靠异步 effect 持久化，旧页面卸载时写入会丢失，新页面又恢复成旧覆盖。
  const update = useCallback((patch: Partial<CustomizerSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 存储不可用（隐私模式等）时仅内存生效
    }
  }, []);

  const setStyle = useCallback(
    (style: ThemeStyle) => update({ style }),
    [update]
  );

  const setMode = useCallback((mode: ThemeMode) => update({ mode }), [update]);

  const toggleMode = useCallback(
    () =>
      update({
        mode: settingsRef.current.mode === "dark" ? "light" : "dark",
      }),
    [update]
  );

  const setDirection = useCallback(
    (direction: ThemeDirection | null) => update({ direction }),
    [update]
  );

  const setColor = useCallback(
    (color: ThemeColor) => update({ color }),
    [update]
  );

  const reset = useCallback(() => update(DEFAULT_SETTINGS), [update]);

  const value = useMemo(
    () => ({
      settings,
      mounted,
      resolvedDirection,
      setStyle,
      setMode,
      toggleMode,
      setDirection,
      setColor,
      reset,
    }),
    [
      settings,
      mounted,
      resolvedDirection,
      setStyle,
      setMode,
      toggleMode,
      setDirection,
      setColor,
      reset,
    ]
  );

  return (
    <CustomizerContext.Provider value={value}>
      {children}
    </CustomizerContext.Provider>
  );
}

export function useCustomizer(): CustomizerContextValue {
  const ctx = useContext(CustomizerContext);
  if (!ctx) {
    throw new Error("useCustomizer must be used within a CustomizerProvider");
  }
  return ctx;
}
