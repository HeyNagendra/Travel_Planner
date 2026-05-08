import { useState, useEffect } from 'react';

interface UseDarkModeReturn {
  isDarkMode: boolean;
  setDarkMode: (isDark: boolean) => void;
}

export function useDarkMode(): UseDarkModeReturn {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [themeOverridden, setThemeOverridden] = useState(false);

  useEffect(() => {
    if (themeOverridden) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [themeOverridden]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const setDarkMode = (isDark: boolean) => {
    setIsDarkMode(isDark);
    setThemeOverridden(true);
  };

  return { isDarkMode, setDarkMode };
}
