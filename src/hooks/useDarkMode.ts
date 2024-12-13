import { createEffect, type Resource } from "solid-js";

export function useDarkMode(config: Resource<Config>) {
  const switchDark = (isDark: boolean) => {
    window.document.documentElement.classList.toggle("dark", isDark);
  };

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  createEffect(() => {
    const darkMode = config()?.dark_mode;
    if (!darkMode) return;

    const handleSystemTheme = (event?: MediaQueryListEvent) => {
      const isDark = event ? event.matches : mediaQuery.matches;
      switchDark(darkMode === "system" ? isDark : darkMode === "dark");
    };

    if (darkMode === "system") {
      mediaQuery.addEventListener("change", handleSystemTheme);
      handleSystemTheme();

      return () => {
        // cleanup 移除监听器
        mediaQuery.removeEventListener("change", handleSystemTheme);
      };
    }
    switchDark(darkMode === "dark");
  });

  return {
    isDarkMode: () =>
      config()?.dark_mode === "dark" ||
      (config()?.dark_mode === "system" &&
        matchMedia("(prefers-color-scheme: dark)").matches),
  };
}
