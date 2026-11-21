import { useId, useRef } from 'react';
import { t } from '../copy';
import { Modal } from './Modal';
import { dangerButton, secondaryButton } from './buttons';

// Board 6 state E. The scope is named in the question; focus starts on the safe choice.
export function ClearDataDialog({
  open,
  files,
  runs,
  onKeep,
  onConfirm,
}: {
  open: boolean;
  files: number;
  runs: number;
  onKeep: () => void;
  onConfirm: () => void;
}) {
  const id = useId();
  const keep = useRef<HTMLButtonElement>(null);
  return (
    <Modal open={open} onClose={onKeep} labelledBy={`${id}-title`} describedBy={`${id}-desc`} initialFocus={keep}>
      <div className="flex flex-col gap-3.5">
        <h2 id={`${id}-title`} className="m-0 text-xl font-semibold">
          {t('clear.title')}
        </h2>
        <p id={`${id}-desc`} className="m-0 text-sm text-fg-secondary">
          {t('clear.body', { files, runs })}
        </p>
        <div className="flex justify-end gap-2">
          <button ref={keep} type="button" className={`${secondaryButton} h-9 px-3.5 text-sm`} onClick={onKeep}>
            {t('clear.keep')}
          </button>
          <button type="button" className={`${dangerButton} h-9 text-sm`} onClick={onConfirm}>
            {t('clear.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
