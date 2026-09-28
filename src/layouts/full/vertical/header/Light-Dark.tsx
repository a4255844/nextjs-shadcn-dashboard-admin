"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useCustomizer } from "@/components/customizer/customizer-context";

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => {
    ready: Promise<void>;
  };
};

const LightDark = () => {
  const { settings, mounted, setMode } = useCustomizer();
  const isDark = settings.mode === "dark";

  const toggleTheme = async () => {
    const newMode = isDark ? "light" : "dark";

    // 立即改 class，保证 View Transition 捕获到新主题快照；
    // React 状态与 localStorage 由 CustomizerProvider 统一接管（class 切换幂等）。
    const applyTheme = () => {
      document.documentElement.classList.toggle("dark", newMode === "dark");
      setMode(newMode);
    };

    if (!(document as DocumentWithViewTransition).startViewTransition) {
      applyTheme();
      return;
    }

    const transition = (
      document as DocumentWithViewTransition
    ).startViewTransition!(applyTheme);
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

  if (!mounted) {
    return null;
  }

  return (
    <div>
      <Button
        variant="ghost"
        className="h-10 w-10 hover:bg-primary/5 rounded-full cursor-pointer"
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </Button>
    </div>
  );
};

export default LightDark;
