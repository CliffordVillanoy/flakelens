import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { getPref } from './prefs';

const sheet = create<{ open: boolean }>()(() => ({ open: false }));

/** The "?" shortcuts sheet: opened by the "?" key and the header "?" button, shown by <ShortcutsSheet/>. */
export const shortcutsSheet = {
  open: () => sheet.setState({ open: true }),
  close: () => sheet.setState({ open: false }),
};
export const useSheetOpen = () => sheet((s) => s.open);

export const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/** Single-key shortcuts are on unless the user switched them off (WCAG 2.1.4). Read at every key press. */
export const shortcutsEnabled = () => getPref<boolean>('shortcuts', true) !== false;

/**
 * Global keyboard shortcuts (IA section 5). Single-key shortcuts never fire while typing in a text field
 * and can be switched off (pref "shortcuts"). Escape is not a single-character shortcut, so it always works.
 */
export function useShortcuts(handlers: Record<string, () => void>) {
  const latest = useRef(handlers);
  latest.current = handlers;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const run = latest.current[e.key];
      if (!run) return;
      // Escape always works. Other keys are ignored in text fields, when switched off, and while a dialog is
      // open (otherwise "?" would stack the sheet on top of another dialog).
      if (e.key !== 'Escape' && (isTyping(e.target) || !shortcutsEnabled() || document.querySelector('dialog[open]'))) return;
      e.preventDefault();
      run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
