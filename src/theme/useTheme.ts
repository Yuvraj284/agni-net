import { useSyncExternalStore } from 'react';
import { getTheme, setTheme, subscribeTheme, type Theme } from './theme';

export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => 'light' as Theme);
  return [theme, setTheme];
}
