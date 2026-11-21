import { getPref, setPref } from './prefs';

export type Theme = 'dark' | 'light';

export const currentTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  setPref('theme', theme);
}

// Called in main.tsx before the first render, so the page never flashes the wrong theme. Dark is the default.
export function applyTheme(): void {
  document.documentElement.dataset.theme = getPref<Theme>('theme', 'dark') === 'light' ? 'light' : 'dark';
}
