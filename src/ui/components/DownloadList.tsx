import type { ImportRecord } from '@/engine/types';
import { t } from '../copy';
import { notImportedCsv, notImportedJson, notImportedRows } from '../data/loaded';
import { downloadFile } from '../lib/download';
import { secondaryButton } from './buttons';

// "Download not-imported list: CSV JSON". Both files hold the same rows, built from the same cleaned values.
export function DownloadList({ records }: { records: ImportRecord[] }) {
  if (notImportedRows(records).length === 0) return null;
  const label = t('import.downloadList');
  const button = 'h-7 px-2.5 text-[13px]';
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      {label}:
      <button
        type="button"
        aria-label={`${label}: ${t('data.download.csv')}`}
        className={`${secondaryButton} ${button}`}
        onClick={() => downloadFile('not-imported.csv', 'text/csv;charset=utf-8', notImportedCsv(records))}
      >
        {t('data.download.csv')}
      </button>
      <button
        type="button"
        aria-label={`${label}: ${t('data.download.json')}`}
        className={`${secondaryButton} ${button}`}
        onClick={() => downloadFile('not-imported.json', 'application/json', notImportedJson(records))}
      >
        {t('data.download.json')}
      </button>
    </div>
  );
}
