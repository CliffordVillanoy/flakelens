import { getPref, setPref } from './prefs';

export type Theme = 'dark' | 'light';

export const currentTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

const CHANGED = 'flakelens-theme';

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  setPref('theme', theme);
  window.dispatchEvent(new Event(CHANGED)); // the header logo follows a change made on the Settings page
}

/** For useSyncExternalStore: re-read currentTheme() after setTheme. */
export const subscribeTheme = (cb: () => void) => {
  window.addEventListener(CHANGED, cb);
  return () => window.removeEventListener(CHANGED, cb);
};

// Called in main.tsx before the first render, so the page never flashes the wrong theme. Dark is the default.
export function applyTheme(): void {
  document.documentElement.dataset.theme = getPref<Theme>('theme', 'dark') === 'light' ? 'light' : 'dark';
}
