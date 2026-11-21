import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}

// Native <dialog>: modal, the page behind is inert. Esc closes it; focus starts on `initialFocus` and goes back
// to whatever had it when the dialog opened.
export function Modal({ open, onClose, labelledBy, describedBy, initialFocus, className = '', children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      d.showModal();
      initialFocus?.current?.focus();
    } else if (!open && d.open) d.close();
    if (!open && wasOpen.current) opener.current?.focus();
    wasOpen.current = open;
  }, [open, initialFocus]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClose={() => open && onClose()}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation(); // the page's own Esc (close the panel) must not also fire
        if (open) onClose();
      }}
      className={`m-auto w-[calc(100%-32px)] max-w-[502px] rounded-lg border border-border bg-card p-5 text-foreground backdrop:bg-black/50 ${className}`}
    >
      {open && children}
    </dialog>
  );
}
