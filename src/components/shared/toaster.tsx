"use client";

import { useCustomizer } from "@/components/customizer/customizer-context";
import { Toaster as SonnerToaster, type ToasterProps } from "@/components/ui/sonner";

/**
 * 全局 toast 容器：方向随 Customizer 的 resolvedDirection（含 RTL），
 * 明暗随 settings.mode。必须在 CustomizerProvider 内使用。
 */
export default function Toaster(props: ToasterProps) {
  const { settings, resolvedDirection } = useCustomizer();

  return (
    <SonnerToaster
      dir={resolvedDirection}
      theme={settings.mode}
      richColors
      position="bottom-right"
      {...props}
    />
  );
}
