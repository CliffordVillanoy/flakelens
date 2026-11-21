import { useEffect, useId, useRef } from 'react';
import { t } from '../copy';
import { primaryButton, secondaryButton } from './buttons';

// Board 2, state D. Native <dialog>: modal, Esc closes it, the page behind is inert. Focus starts on the safe choice.
export function LeaveSampleDialog({ count, onStay, onConfirm }: { count: number | null; onStay: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const stay = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current!;
    if (count !== null && !d.open) {
      d.showModal();
      stay.current?.focus();
    } else if (count === null && d.open) d.close();
  }, [count]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
      onClose={() => count !== null && onStay()}
      className="m-auto w-[calc(100%-32px)] max-w-[502px] rounded-lg border border-border bg-card p-5 text-foreground backdrop:bg-black/50"
    >
      {count !== null && (
        <div className="flex flex-col gap-3.5">
          <h2 id={`${id}-title`} className="m-0 text-xl font-semibold">
            {t('leaveSample.title')}
          </h2>
          <p id={`${id}-desc`} className="m-0 text-sm text-fg-secondary">
            {t('leaveSample.body', { count })}
          </p>
          <div className="flex justify-end gap-2">
            <button ref={stay} type="button" className={`${secondaryButton} h-9 px-3.5 text-sm`} onClick={onStay}>
              {t('leaveSample.stay')}
            </button>
            <button type="button" className={`${primaryButton} h-9 text-sm`} onClick={onConfirm}>
              {t('leaveSample.confirm')}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
