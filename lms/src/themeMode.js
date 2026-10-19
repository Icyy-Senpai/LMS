import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

// Light / dark mode for the whole app. The choice is remembered per browser; the first visit follows the
// device's own setting. <html data-theme="light|dark"> lets App.css restyle things outside Ant Design.
const STORAGE_KEY = 'themeMode';

const initialMode = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (e) { /* storage blocked */ }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const ThemeModeContext = createContext({ mode: 'light', toggle: () => {} });

export function useThemeModeState() {
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    try { localStorage.setItem(STORAGE_KEY, mode); } catch (e) { /* storage blocked */ }
  }, [mode]);

  // `origin` = the click position: the new theme is revealed as a circle growing from there
  // (View Transitions API; browsers without it just switch instantly).
  const toggle = useCallback((origin) => {
    const next = mode === 'dark' ? 'light' : 'dark';
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) { setMode(next); return; }
    const x = origin?.x ?? window.innerWidth - 40;
    const y = origin?.y ?? 32;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = document.startViewTransition(() => {
      flushSync(() => setMode(next));
      document.documentElement.dataset.theme = next; // apply before the "after" snapshot is taken
    });
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  }, [mode]);

  return { mode, toggle };
}

export const ThemeModeProvider = ThemeModeContext.Provider;
export const useThemeMode = () => useContext(ThemeModeContext);
