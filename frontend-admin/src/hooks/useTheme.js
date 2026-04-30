import { useState, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'hmt-admin-theme';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem(STORAGE_KEY) || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  /**
   * Concrete hex values for things that need real colors (Recharts SVG fills, etc.)
   * Recompute when theme changes.
   */
  const colors = useMemo(() => {
    const isDark = theme === 'dark';
    return {
      primary:        '#FF6B00',
      primaryDark:    '#E05A00',
      accent:         '#FF8C3A',
      success:        '#16A34A',
      error:          '#DC2626',
      warning:        '#D97706',
      text:           isDark ? '#FFFFFF' : '#111111',
      textMuted:      isDark ? '#A0A0A0' : '#555555',
      textDim:        isDark ? '#555555' : '#999999',
      bg:             isDark ? '#0A0A0A' : '#F8F8F8',
      bg2:            isDark ? '#141414' : '#FFFFFF',
      border:         isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)',
      gridStroke:     isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      tooltipBg:      isDark ? '#141414' : '#FFFFFF',
      tooltipBorder:  isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    };
  }, [theme]);

  return { theme, toggle, colors, isDark: theme === 'dark' };
}
