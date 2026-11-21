import { CircleAlert, CircleCheck, X } from 'lucide-react';
import type { ImportRecord, NoticeCode } from '@/engine/types';
import { t, type CopyKey } from '../copy';
import type { LastImport } from '../data/store';
import { secondaryButton } from './buttons';

const MAX_EXAMPLES = 3; // spec 9.1: counts first, then up to three example problems

function downloadNotImported(records: ImportRecord[]) {
  const rows = records.flatMap((r) =>
    r.notices.filter((n) => n.severity === 'warning').map((n) => ({ file: r.fileName, code: n.code, ...n.params })),
  );
  const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'not-imported.json' });
  a.click();
  URL.revokeObjectURL(url);
}

// Board 2, state B: one banner per drop for the files that imported. Failed files show at the drop zone instead.
export function ImportBanner({
  summary,
  totals,
  onDismiss,
}: {
  summary: LastImport;
  totals: { tests: number; runs: number };
  onDismiss: () => void;
}) {
  const records = summary.records.filter((r) => r.result !== 'failed');
  if (records.length === 0) return null;

  const notImported = records.reduce((n, r) => n + r.counts.notImported, 0);
  const notices = records.flatMap((r) => r.notices);
  const warned = notices.some((n) => n.severity === 'warning');
  const headline =
    notImported > 0
      ? t('import.partial', { ...totals, count: notImported })
      : summary.wasEmpty
        ? t('import.success', totals)
        : t('import.added', { ...totals, newRuns: summary.newRuns });
  const examples = [
    ...new Set(
      [...notices]
        .sort((a, b) => Number(b.severity === 'warning') - Number(a.severity === 'warning'))
        .map((n) => t(n.code as NoticeCode & CopyKey, n.params)),
    ),
  ].slice(0, MAX_EXAMPLES);

  return (
    <div role="status" aria-label={t('import.result')} className="flex gap-3 rounded-lg border border-border bg-card px-4 py-3.5">
      {warned || notImported > 0 ? (
        <CircleAlert size={20} className="shrink-0 text-status-flaky" aria-hidden="true" />
      ) : (
        <CircleCheck size={20} className="shrink-0 text-status-stable" aria-hidden="true" />
      )}
      <div className="flex flex-1 flex-col gap-1.5 text-sm">
        <div className="font-semibold">{headline}</div>
        {!summary.wasEmpty && summary.newFlaky > 0 && (
          <a href="#/tests?status=flaky">{t('import.rankChange.link', { count: summary.newFlaky })}</a>
        )}
        {examples.length > 0 && (
          <ul className="m-0 flex flex-col gap-0.5 pl-[18px] text-fg-secondary">
            {examples.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        )}
        {(warned || notImported > 0) && (
          <div className="flex flex-wrap items-center gap-3">
            <a href="#/data">{t('import.viewNotices')}</a>
            {notImported > 0 && (
              <button type="button" className={`${secondaryButton} h-7 text-[13px]`} onClick={() => downloadNotImported(records)}>
                {t('import.downloadList')}
              </button>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label={t('banner.dismiss')}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-surface-hover"
        onClick={onDismiss}
      >
        <X size={16} className="text-fg-secondary" aria-hidden="true" />
      </button>
    </div>
  );
}
