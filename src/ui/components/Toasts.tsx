import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { create } from 'zustand';
import { t } from '../copy';

type Kind = 'info' | 'error';
interface ToastState {
  items: { id: number; text: string; kind: Kind }[];
  push(text: string, kind: Kind): void;
  remove(id: number): void;
}
const MAX_TOASTS = 2;
let next = 0;
// Oldest first, so the newest sits at the bottom; at most 2 at a time (the oldest makes room).
const useToasts = create<ToastState>()((set) => ({
  items: [],
  push: (text, kind) => set((s) => ({ items: [...s.items, { id: next++, text, kind }].slice(-MAX_TOASTS) })),
  remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

/** Success and info toast (DESIGN.md "System banners and toasts"): bottom left, newest at the bottom, closes after 5 s. */
export const toast = (text: string) => useToasts.getState().push(text, 'info');
/** Error toast: role alert, stays until dismissed. */
export const toastError = (text: string) => useToasts.getState().push(text, 'error');

const CLOSE_MS = 5000;
const FADE_MS = 150;
const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Esc on the focused toast closes it; the page's own Esc (closing the panel) must not also fire.
const closeOnEsc = (close: () => void) => (e: React.KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  e.stopPropagation();
  close();
};

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={t('banner.dismiss')}
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-surface-hover"
      onClick={onClick}
    >
      <X size={16} aria-hidden="true" />
    </button>
  );
}

function InfoToast({ text, leaving, close }: { text: string; leaving: boolean; close: () => void }) {
  const held = useRef(false);
  useEffect(() => {
    // Closes after 5 s, but never while hovered or focused.
    const timer = setInterval(() => !held.current && close(), CLOSE_MS);
    return () => clearInterval(timer);
  }, [close]);
  return (
    <div
      data-toast
      onMouseEnter={() => (held.current = true)}
      onMouseLeave={() => (held.current = false)}
      onFocus={() => (held.current = true)}
      onBlur={() => (held.current = false)}
      onKeyDown={closeOnEsc(close)}
      className={`pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm ${leaving ? 'motion-safe:animate-[toast-out_150ms_ease-in_forwards]' : 'motion-safe:animate-[toast-in_150ms_ease-out]'}`}
    >
      <span className="min-w-0 flex-1">{text}</span>
      <DismissButton onClick={close} />
    </div>
  );
}

export function Toasts() {
  const items = useToasts((s) => s.items);
  const remove = useToasts((s) => s.remove);
  const [leaving, setLeaving] = useState<number[]>([]);
  const dismiss = (id: number) => {
    if (reducedMotion()) return remove(id);
    setLeaving((l) => [...l, id]);
    setTimeout(() => {
      remove(id);
      setLeaving((l) => l.filter((x) => x !== id));
    }, FADE_MS);
  };
  // Bottom left on desktop, full width on phones. The box lets clicks through; each toast takes them back.
  return (
    <div data-toasts className="pointer-events-none fixed bottom-4 left-4 z-50 flex w-[480px] max-w-[calc(100%-32px)] flex-col gap-2 max-sm:inset-x-4 max-sm:w-auto max-sm:max-w-none">
      {items.map((x) =>
        x.kind === 'error' ? (
          <div key={x.id} role="alert" onKeyDown={closeOnEsc(() => dismiss(x.id))} className="pointer-events-auto flex items-center gap-3 rounded-lg border border-danger-border bg-diff-del px-4 py-3 text-sm motion-safe:animate-[toast-in_150ms_ease-out]">
            <span className="min-w-0 flex-1">{x.text}</span>
            <DismissButton onClick={() => dismiss(x.id)} />
          </div>
        ) : (
          <div key={x.id} role="status" aria-live="polite">
            <InfoToast text={x.text} leaving={leaving.includes(x.id)} close={() => dismiss(x.id)} />
          </div>
        ),
      )}
    </div>
  );
}
