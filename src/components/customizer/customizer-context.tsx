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
  STORAGE_KEY,
  THEME_STYLES,
  type CustomizerSettings,
  type ThemeStyle,
} from "./types";

interface CustomizerContextValue {
  settings: CustomizerSettings;
  /** 是否已从 localStorage 完成恢复（首帧为 false） */
  mounted: boolean;
  setStyle: (style: ThemeStyle) => void;
  reset: () => void;
}

const CustomizerContext = createContext<CustomizerContextValue | null>(null);

function loadSettings(): CustomizerSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<CustomizerSettings>;
    return {
      style: THEME_STYLES.includes(parsed.style as ThemeStyle)
        ? (parsed.style as ThemeStyle)
        : DEFAULT_SETTINGS.style,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function CustomizerProvider({ children }: { children: ReactNode }) {
  // 始终以默认值启动，保证 SSR 与首帧一致，避免 hydration mismatch
  const [settings, setSettings] = useState<CustomizerSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  // hydration 后读取持久化设置（首屏的 data-style 已由内联脚本提前写入）
  useEffect(() => {
    setSettings(loadSettings());
    setMounted(true);
  }, []);

  // 同步到 <html data-style>
  useEffect(() => {
    document.documentElement.dataset.style = settings.style;
  }, [settings.style]);

  // 持久化
  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, mounted]);

  const setStyle = useCallback((style: ThemeStyle) => {
    setSettings((prev) => ({ ...prev, style }));
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(
    () => ({ settings, mounted, setStyle, reset }),
    [settings, mounted, setStyle, reset]
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
