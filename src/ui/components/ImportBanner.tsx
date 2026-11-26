import { CircleAlert, CircleCheck, X } from 'lucide-react';
import type { NoticeCode } from '@/engine/types';
import { t, type CopyKey } from '../copy';
import type { LastImport } from '../data/store';
import { DownloadList } from './DownloadList';

const MAX_EXAMPLES = 3; // spec 9.1: counts first, then up to three example problems

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
  // One note per import for files without commit info (a list of the same line per file reads as noise).
  const noCommit = records.filter((r) => r.notices.some((n) => n.code === 'import.noCommit'));
  const others = notices.filter((n) => n.code !== 'import.noCommit');
  const noCommitLine =
    noCommit.length > 1
      ? t('import.noCommit.many', { count: noCommit.length })
      : noCommit.length === 1
        ? t('import.noCommit', { file: noCommit[0]!.fileName })
        : null;
  const examples = [
    ...new Set(
      [...others]
        .sort((a, b) => Number(b.severity === 'warning') - Number(a.severity === 'warning'))
        .map((n) => t(n.code as NoticeCode & CopyKey, n.params)),
    ),
    ...(noCommitLine ? [noCommitLine] : []),
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
            <DownloadList records={records} />
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
