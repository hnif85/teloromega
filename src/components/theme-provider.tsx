"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

type Theme = "light" | "dark";
type ThemeContext = { theme: Theme; resolvedTheme: Theme; setTheme: (t: Theme) => void };

const ctx = createContext<ThemeContext>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
});
export const useTheme = () => useContext(ctx);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("theme", t); } catch {}
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const init = stored === "dark" || stored === "light" ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setThemeState(init);
    document.documentElement.className = init;
    document.documentElement.style.colorScheme = init;
  }, []);

  useEffect(() => {
    document.documentElement.className = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <ctx.Provider value={{ theme, resolvedTheme: theme, setTheme }}>
      {children}
    </ctx.Provider>
  );
}
