"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/** Compact theme toggle styled for the dark sidebar background. */
export function SidebarThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      data-tour="theme-toggle"
      aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="size-8 rounded-lg flex items-center justify-center text-cream-300/70 hover:text-cream-100 hover:bg-sidebar-accent transition-colors shrink-0"
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-3.5 text-amber-400" />
        ) : (
          <Moon className="size-3.5" />
        )
      ) : (
        <div className="size-3.5" />
      )}
    </button>
  );
}
