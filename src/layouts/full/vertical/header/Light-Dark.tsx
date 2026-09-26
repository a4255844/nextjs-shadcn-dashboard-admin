"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const LightDark = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = async () => {
    const newMode = !isDark;
    setIsDark(newMode);

    const applyTheme = () => {
      if (newMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
    };

    if (!(document as Document & { startViewTransition?: (callback: () => void) => { ready: Promise<void> } }).startViewTransition) {
      applyTheme();
      return;
    }

    const transition = (document as Document & { startViewTransition: (callback: () => void) => { ready: Promise<void> } }).startViewTransition(applyTheme);
    await transition.ready;

    document.documentElement.animate(
      {
        clipPath: ["inset(0 0 100% 0)", "inset(0)"],
      },
      {
        duration: 800,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div>
      <Button
        variant="ghost"
        className="h-10 w-10 hover:bg-primary/5 rounded-full cursor-pointer"
        onClick={toggleTheme}
      >
        {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </Button>
    </div>
  );
};

export default LightDark;
