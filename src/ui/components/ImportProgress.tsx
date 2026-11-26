import { useEffect, useState } from 'react';
import { t } from '../copy';
import { secondaryButton } from './buttons';

// Board 2, state A. The worker reports per finished file, so the file being read shows a moving bar, not a percent.
export function ImportProgress({ files, done, onCancel }: { files: string[]; done: number; onCancel: () => void }) {
  const [showCancel, setShowCancel] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShowCancel(true), 1000);
    return () => clearTimeout(id);
  }, []);

  return (
    <div role="status" className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-input bg-card p-5">
      <div className="text-[15px] font-semibold">{t('import.reading', { count: files.length })}</div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {files.map((name, i) => (
          <li key={i} className="flex flex-col gap-1">
            <div className="flex justify-between gap-3 text-[13px]">
              <span className="truncate">{name}</span>
              <span className="text-muted-foreground">
                {i < done ? t('import.file.done') : i > done ? t('import.file.waiting') : t('import.progress.reading')}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-secondary">
              <div
                className={`h-1.5 rounded-sm bg-link ${i === done ? 'w-1/3 motion-safe:animate-pulse' : i < done ? 'w-full' : 'w-0'}`}
              />
            </div>
          </li>
        ))}
      </ul>
      {showCancel && (
        <div>
          <button type="button" className={`${secondaryButton} h-8`} onClick={onCancel}>
            {t('import.cancel')}
          </button>
        </div>
      )}
    </div>
  );
}
