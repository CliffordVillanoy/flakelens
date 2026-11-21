import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { create } from 'zustand';
import { t } from '../copy';

type Kind = 'info' | 'error';
interface ToastState {
  items: { id: number; text: string; kind: Kind }[];
  push(text: string, kind: Kind): void;
  remove(id: number): void;
}
let next = 0;
const useToasts = create<ToastState>()((set) => ({
  items: [],
  push: (text, kind) => set((s) => ({ items: [{ id: next++, text, kind }, ...s.items] })),
  remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

/** Success and info toast (DESIGN.md "Component states"): bottom right, newest on top, closes after 5 s. */
export const toast = (text: string) => useToasts.getState().push(text, 'info');
/** Error toast: role alert, stays until dismissed. */
export const toastError = (text: string) => useToasts.getState().push(text, 'error');

const CLOSE_MS = 5000;

function InfoToast({ id, text }: { id: number; text: string }) {
  const remove = useToasts((s) => s.remove);
  const held = useRef(false);
  useEffect(() => {
    // Closes after 5 s, but never while hovered or focused.
    const timer = setInterval(() => !held.current && remove(id), CLOSE_MS);
    return () => clearInterval(timer);
  }, [id, remove]);
  return (
    <div
      onMouseEnter={() => (held.current = true)}
      onMouseLeave={() => (held.current = false)}
      onFocus={() => (held.current = true)}
      onBlur={() => (held.current = false)}
      className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
    >
      {text}
    </div>
  );
}

export function Toasts() {
  const items = useToasts((s) => s.items);
  const remove = useToasts((s) => s.remove);
  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {items.some((x) => x.kind === 'error') && (
        <div role="alert" className="flex flex-col gap-2">
          {items
            .filter((x) => x.kind === 'error')
            .map((x) => (
              <div
                key={x.id}
                className="flex items-center gap-3 rounded-lg border border-danger-border bg-diff-del px-4 py-3 text-sm"
              >
                <span className="flex-1">{x.text}</span>
                <button
                  type="button"
                  aria-label={t('banner.dismiss')}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-surface-hover"
                  onClick={() => remove(x.id)}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
        </div>
      )}
      <div role="status" aria-live="polite" className="flex flex-col gap-2">
        {items
          .filter((x) => x.kind === 'info')
          .map((x) => (
            <InfoToast key={x.id} id={x.id} text={x.text} />
          ))}
      </div>
    </div>
  );
}
