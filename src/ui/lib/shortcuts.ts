import { useEffect, useRef } from 'react';
import { getPref } from './prefs';

/** The "?" shortcuts sheet. DEV-17 replaces open() with the real sheet; until then it does nothing. */
export const shortcutsSheet = { open: () => {} };

export const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/**
 * Global keyboard shortcuts (IA section 5). Single-key shortcuts never fire while typing in a text field
 * and can be switched off (pref "shortcuts", WCAG 2.1.4). Escape is not a single-character shortcut, so it
 * always works.
 */
export function useShortcuts(handlers: Record<string, () => void>) {
  const latest = useRef(handlers);
  latest.current = handlers;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const run = latest.current[e.key];
      if (!run) return;
      if (e.key !== 'Escape' && (isTyping(e.target) || getPref<boolean>('shortcuts', true) === false)) return;
      e.preventDefault();
      run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
