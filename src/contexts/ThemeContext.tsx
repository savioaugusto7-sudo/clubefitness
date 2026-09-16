'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'auto';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  isLight: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  resolvedTheme: 'dark',
  isLight: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  // Determina o tema resolvido (light ou dark)
  const getSystemTheme = (): 'dark' | 'light' => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  };

  const applyTheme = (targetTheme: ThemeMode) => {
    if (typeof document === 'undefined') return;
    
    const resolved = targetTheme === 'auto' ? getSystemTheme() : targetTheme;
    setResolvedTheme(resolved);

    const root = document.documentElement;
    if (resolved === 'light') {
      root.setAttribute('data-theme', 'light');
      root.classList.add('theme-light');
      root.classList.remove('theme-dark');
      root.style.colorScheme = 'light';
    } else {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('theme-dark');
      root.classList.remove('theme-light');
      root.style.colorScheme = 'dark';
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('clube_theme') as ThemeMode | null;
      const initialTheme = saved || 'dark';
      setThemeState(initialTheme);
      applyTheme(initialTheme);
    } catch (e) {
      applyTheme('dark');
    }
    setMounted(true);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleSystemChange = () => {
      const current = localStorage.getItem('clube_theme') as ThemeMode | null;
      if (current === 'auto') {
        applyTheme('auto');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('clube_theme', newTheme);
    } catch (e) {}
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme: mounted ? resolvedTheme : 'dark',
        isLight: mounted && resolvedTheme === 'light',
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
