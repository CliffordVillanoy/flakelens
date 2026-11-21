import { useEffect, useRef } from 'react';
import { create } from 'zustand';

interface ToastState {
  items: { id: number; text: string }[];
  push(text: string): void;
  remove(id: number): void;
}
let next = 0;
const useToasts = create<ToastState>()((set) => ({
  items: [],
  push: (text) => set((s) => ({ items: [{ id: next++, text }, ...s.items] })),
  remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

/** Success and info toast (DESIGN.md "Component states"): bottom right, newest on top. */
export const toast = (text: string) => useToasts.getState().push(text);

const CLOSE_MS = 5000;

function Toast({ id, text }: { id: number; text: string }) {
  const remove = useToasts((s) => s.remove);
  const held = useRef(false);
  useEffect(() => {
    // Closes after 5 s, but never while hovered or focused.
    const timer = setInterval(() => !held.current && remove(id), CLOSE_MS);
    return () => clearInterval(timer);
  }, [id, remove]);
  const hold = { onMouseEnter: () => (held.current = true), onMouseLeave: () => (held.current = false) };
  return (
    <div
      {...hold}
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
  return (
    <div role="status" aria-live="polite" className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {items.map((x) => (
        <Toast key={x.id} {...x} />
      ))}
    </div>
  );
}
