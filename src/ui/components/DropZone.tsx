import { useState, type DragEvent } from 'react';
import { CircleX, Upload } from 'lucide-react';
import type { ImportRecord } from '@/engine/types';
import { t, type CopyKey } from '../copy';
import type { ImportError } from '../data/store';
import { linkButton, primaryButton, secondaryButton } from './buttons';

export const filesFrom = (e: DragEvent) => [...(e.dataTransfer?.files ?? [])];

// A failure copy line split so the file name comes first in bold and the reason follows on its own line.
function FailureCard({ code, params, onFormatHelp }: { code: CopyKey; params: Record<string, string | number>; onFormatHelp?: () => void }) {
  const MARK = '\u0000';
  const text = t(code, { ...params, file: MARK });
  const cut = text.indexOf('. ') + 1 || text.length;
  const [before, after] = text.slice(0, cut).split(MARK);
  return (
    <div className="flex gap-2.5 rounded-md border border-danger-border bg-diff-del p-3">
      <CircleX size={18} className="shrink-0 text-status-failing" aria-hidden="true" />
      <div className="flex flex-col gap-1 text-sm">
        <div>
          {after === undefined ? before : <>{before}<strong>{String(params.file)}</strong>{after}</>}
        </div>
        {cut < text.length && <div className="text-fg-secondary">{text.slice(cut).trim()}</div>}
        {code === 'import.fail.format' && onFormatHelp && (
          <button type="button" className={`${linkButton} self-start text-sm`} onClick={onFormatHelp}>
            {t('import.formatHelp')}
          </button>
        )}
      </div>
    </div>
  );
}

interface Props {
  onFiles: (files: File[]) => void;
  onBrowse: () => void;
  // Board 1: the Start call to action. Board 2 state C: failures, the count of other files, and Browse again.
  failed?: ImportRecord[];
  others?: number;
  error?: ImportError | null;
  onFormatHelp?: () => void;
}

export function DropZone({ onFiles, onBrowse, failed = [], others = 0, error, onFormatHelp }: Props) {
  const [over, setOver] = useState(false);
  const feedback = failed.length > 0 || !!error;
  const handlers = {
    onDragOver: (e: DragEvent) => {
      if (![...e.dataTransfer.types].includes('Files')) return;
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setOver(false);
      onFiles(filesFrom(e));
    },
  };

  return (
    <section
      aria-label={t('import.region')}
      {...handlers}
      className={`flex flex-col gap-3 rounded-lg border-2 border-dashed bg-card ${over ? 'border-link bg-accent' : feedback ? 'border-input' : 'border-link'} ${feedback ? 'p-5' : 'items-center gap-3.5 px-6 py-10 text-center'}`}
    >
      {feedback ? (
        <>
          <div role="alert" className="flex flex-col gap-2">
            {failed.map((r) => {
              const n = r.notices.find((x) => x.severity === 'error');
              return n && <FailureCard key={r.importId} code={n.code as CopyKey} params={n.params} onFormatHelp={onFormatHelp} />;
            })}
            {error && <FailureCard code={error.code} params={'file' in error ? { file: error.file } : 'limit' in error ? { limit: error.limit } : {}} />}
          </div>
          {others > 0 && <div className="text-sm text-fg-secondary">{t('import.others', { count: others })}</div>}
          <div>
            <button type="button" className={`${primaryButton} h-9 text-sm`} onClick={onBrowse}>
              {t('start.browse')}
            </button>
          </div>
        </>
      ) : (
        <>
          <Upload size={40} strokeWidth={1.5} className="text-link" aria-hidden="true" />
          <div className="text-[17px] font-semibold">{t('start.drop.title')}</div>
          <div className="text-sm text-muted-foreground">{t('start.drop.hint')}</div>
          <div className="mt-1.5 flex flex-wrap justify-center gap-3">
            <button type="button" className={`${secondaryButton} h-10 px-[18px] text-sm font-semibold`} onClick={onBrowse}>
              {t('start.browse')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
