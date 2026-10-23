/**
 * Theme store. Light is the default for first-time visitors; the choice is kept in
 * localStorage. index.html runs an inline copy of `readStoredTheme` + `applyTheme` before
 * first paint so there is no flash of the wrong theme — keep THEME_KEY in sync with it.
 */
export type Theme = 'light' | 'dark';
export const THEME_KEY = 'agninet:theme';

export function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#141615' : '#f8f6f1');
}

let current: Theme =
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light';
const listeners = new Set<() => void>();

export const getTheme = (): Theme => current;

export function setTheme(theme: Theme) {
  current = theme;
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable — theme still applies for this session */
  }
  listeners.forEach((l) => l());
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
