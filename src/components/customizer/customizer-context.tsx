"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  LEGACY_THEME_KEY,
  STORAGE_KEY,
  THEME_MODES,
  THEME_STYLES,
  type CustomizerSettings,
  type ThemeMode,
  type ThemeStyle,
} from "./types";

interface CustomizerContextValue {
  settings: CustomizerSettings;
  /** 是否已从 localStorage 完成恢复（首帧为 false） */
  mounted: boolean;
  setStyle: (style: ThemeStyle) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
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
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function CustomizerProvider({ children }: { children: ReactNode }) {
  // 始终以默认值启动，保证 SSR 与首帧一致，避免 hydration mismatch
  const [settings, setSettings] = useState<CustomizerSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  // hydration 后读取持久化设置（首屏的 data-style/.dark 已由内联脚本提前写入）
  useEffect(() => {
    setSettings(loadSettings());
    setMounted(true);
  }, []);

  // 同步到 <html data-style>
  useEffect(() => {
    document.documentElement.dataset.style = settings.style;
  }, [settings.style]);

  // 同步到 <html class="dark">
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.mode === "dark");
  }, [settings.mode]);

  // 持久化
  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, mounted]);

  const setStyle = useCallback((style: ThemeStyle) => {
    setSettings((prev) => ({ ...prev, style }));
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setSettings((prev) => ({ ...prev, mode }));
  }, []);

  const toggleMode = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      mode: prev.mode === "dark" ? "light" : "dark",
    }));
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(
    () => ({ settings, mounted, setStyle, setMode, toggleMode, reset }),
    [settings, mounted, setStyle, setMode, toggleMode, reset]
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
