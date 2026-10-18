"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * 顶部导航进度条（App Router 版）。
 *
 * 原理：Next.js App Router 没有 router.events，无法直接监听导航起止。
 * 这里用事件委托捕获所有 <a> 点击（立即显示进度条），并通过 usePathname
 * 变化判断导航完成（进度条跑完到 100% 并淡出）。browser back/forward 走
 * popstate。router.push 场景下进度条会在路径变化后才出现，仍有反馈。
 *
 * 进度条只推进到 90%（悬停态），导航完成后补到 100%，避免卡在满格给人
 * "假死" 感。
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setVisible(true);
    setProgress(0);
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        // 越接近 90% 越慢，模拟真实加载
        const inc = Math.max(1, (90 - prev) * 0.15);
        return Math.min(prev + inc, 90);
      });
    }, 100);
  };

  const finish = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(100);
    window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 350);
  };

  // 全局拦截 <a> 点击 + browser 前进后退
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // 忽略修饰键点击（新标签页等）
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const link = target?.closest("a");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target === "_blank") return;
      // 仅同源导航触发
      try {
        const url = new URL(link.href);
        if (url.origin !== window.location.origin) return;
      } catch {
        return;
      }
      start();
    };

    const handlePopState = () => start();

    document.addEventListener("click", handleClick);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // 路径变化 = 导航完成。用 rAF 延迟一帧，避免 effect 内同步 setState
  // 触发 react-hooks/set-state-in-effect 规则。
  useEffect(() => {
    const raf = requestAnimationFrame(finish);
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] h-0.5 pointer-events-none">
      <div
        className="h-full bg-primary"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          transition: "width 100ms ease-out, opacity 350ms ease-out",
        }}
      />
    </div>
  );
}
