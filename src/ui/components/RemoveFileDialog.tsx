import { useId, useRef } from 'react';
import type { RemovalImpact } from '@/engine/dataset';
import { t } from '../copy';
import { cleanText } from '../lib/safeText';
import { Modal } from './Modal';
import { dangerButton, secondaryButton } from './buttons';

// Board 10, state 3. Names the file, what goes with it and what stays; focus starts on the safe choice.
export function RemoveFileDialog({
  fileName,
  impact,
  onKeep,
  onConfirm,
}: {
  fileName: string | null;
  impact: RemovalImpact | null;
  onKeep: () => void;
  onConfirm: () => void;
}) {
  const id = useId();
  const keep = useRef<HTMLButtonElement>(null);
  const name = cleanText(fileName ?? '');
  const shared = !!impact && impact.kept > 0 && !impact.last;
  return (
    <Modal open={fileName !== null && impact !== null} onClose={onKeep} labelledBy={`${id}-title`} describedBy={`${id}-desc`} initialFocus={keep}>
      <div className="flex flex-col gap-3.5">
        <h2 id={`${id}-title`} className="m-0 break-all text-xl font-semibold">
          {t('file.remove.title', { file: name })}
        </h2>
        {impact && (
          <div id={`${id}-desc`} className="flex flex-col gap-2 text-sm text-fg-secondary">
            <p className="m-0">
              {impact.last
                ? t('file.remove.last')
                : shared
                  ? t('file.remove.shared', { removed: impact.runs, kept: impact.kept, other: impact.keptIn.map(cleanText).join(', ') })
                  : t('file.remove.body')}
            </p>
            {!impact.last && (
              <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5">
                {!shared && <li>{t('file.remove.runs', { count: impact.runs })}</li>}
                {impact.tests > 0 && <li>{t('file.remove.tests', { count: impact.tests })}</li>}
                {impact.label !== null && <li>{t('file.remove.label', { label: cleanText(impact.label) })}</li>}
              </ul>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button ref={keep} type="button" className={`${secondaryButton} h-9 px-3.5 text-sm`} onClick={onKeep}>
            {t('file.remove.keep')}
          </button>
          <button type="button" className={`${dangerButton} h-9 text-sm`} onClick={onConfirm}>
            {t('file.remove.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
