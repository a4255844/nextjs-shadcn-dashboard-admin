'use client';

import { useEffect, useState } from "react";

// 问候语只存 key，展示时再翻译，避免用英文文案做逻辑判断
export type GreetingKey = "morning" | "afternoon" | "evening" | "night";

// 按当前小时返回问候语 key；首帧返回 null（SSR/CSR 一致，避免 hydration 不匹配）
export function useGreetingKey(): GreetingKey | null {
  const [greeting, setGreeting] = useState<GreetingKey | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      setGreeting("morning");
    } else if (hour >= 12 && hour < 17) {
      setGreeting("afternoon");
    } else if (hour >= 17 && hour < 21) {
      setGreeting("evening");
    } else {
      setGreeting("night");
    }
  }, []);

  return greeting;
}
