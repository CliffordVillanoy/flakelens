import { ImportBanner } from '../components/ImportBanner';
import { ImportProgress } from '../components/ImportProgress';
import { useMemo, useState } from 'react';
import { ArrowLeft, CircleAlert, CircleCheck, CircleX, Info } from 'lucide-react';
import { t } from '../copy';
import { useStore } from '../data/store';
import { fileRows, loadedSummary, noticeRows, runRows, type FileRow } from '../data/loaded';
import { CommitField } from '../components/CommitField';
import { ClearDataDialog } from '../components/ClearDataDialog';
import { DownloadList } from '../components/DownloadList';
import { toast } from '../components/Toasts';
import { dangerButton, linkButton, secondaryButton } from '../components/buttons';
import { navigate } from '../lib/router';

const FIRST_RUNS = 5; // the runs table starts with the newest five (board 5)

const dateTime = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

const RESULT = {
  success: { key: 'data.file.ok', tone: 'bg-status-stable-subtle text-status-stable-text', Icon: CircleCheck },
  partial: { key: 'data.file.partial', tone: 'bg-status-flaky-subtle text-status-flaky-text', Icon: CircleAlert },
  failed: { key: 'data.file.failed', tone: 'bg-status-failing-subtle text-status-failing-text', Icon: CircleX },
} as const;

const SEVERITY_ICON = {
  error: <CircleX size={16} className="mt-0.5 shrink-0 text-status-failing" aria-hidden="true" />,
  warning: <CircleAlert size={16} className="mt-0.5 shrink-0 text-status-flaky" aria-hidden="true" />,
  info: <Info size={16} className="mt-0.5 shrink-0 text-link" aria-hidden="true" />,
} as const;

function FileItem({ f, sample }: { f: FileRow; sample: boolean }) {
  const { key, tone, Icon } = RESULT[f.result];
  const meta = { runs: f.runs, tests: f.tests };
  return (
    <li className="flex flex-wrap items-center gap-3 border-t border-border-muted px-4 py-3 first:border-t-0">
      <div className="min-w-0 flex-[1_1_240px]">
        <div className="font-mono text-[13px] break-all">{f.fileName}</div>
        <div className="text-xs text-muted-foreground">
          {t('data.file.meta', meta)}
        </div>
      </div>
      <span className={`inline-flex h-6 items-center gap-[5px] rounded-full px-2 text-xs font-semibold ${tone}`}>
        <Icon size={14} aria-hidden="true" />
        {t(key)}
      </span>
      {f.runs > 0 && <CommitField f={f} readOnly={sample} />}
    </li>
  );
}

// Board 5: what is loaded, what was not imported and why, the runs, and the one way to remove it all.
export function LoadedData({ onExitSample }: { onExitSample: () => void }) {
  const { dataset: ds, mode, importing, lastImport, cancelImport, dismissImport } = useStore();
  const [showAll, setShowAll] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const summary = useMemo(() => loadedSummary(ds), [ds]);
  const files = useMemo(() => fileRows(ds), [ds]);
  const notices = useMemo(() => noticeRows(ds), [ds]);
  const runs = useMemo(() => runRows(ds), [ds]);
  const shownRuns = showAll ? runs : runs.slice(0, FIRST_RUNS);
  const sample = mode === 'sample';

  const clear = async () => {
    setConfirming(false);
    await useStore.getState().clearAll();
    navigate('#/');
    toast(t('clear.done'));
  };

  return (
    <div className="pg mx-auto flex w-full max-w-[1008px] flex-col gap-5 p-6">
      <div className="flex flex-col gap-1.5">
        <a href="#/tests" className="inline-flex min-h-6 items-center gap-1 self-start text-[13px]">
          <ArrowLeft size={14} aria-hidden="true" />
          {t('data.back')}
        </a>
        <h1 className="m-0 text-2xl font-bold">{t('data.title')}</h1>
        <p className="m-0 text-sm text-muted-foreground">
          {t('data.summary', { files: summary.files, runs: summary.runs, date: summary.lastAdded ? day.format(new Date(summary.lastAdded)) : t('wasted.none') })}
        </p>
      </div>

      {importing && <ImportProgress files={importing.files} done={importing.done} onCancel={cancelImport} />}
      {lastImport && !importing && (
        <ImportBanner
          summary={lastImport}
          totals={{ tests: ds.tests.length, runs: ds.runs.length }}
          onDismiss={dismissImport}
        />
      )}

      <section aria-labelledby="files-title" className="flex flex-col gap-2">
        <h2 id="files-title" className="m-0 text-base font-semibold">
          {t('data.files', { count: files.length })}
        </h2>
        <ul className="m-0 list-none overflow-hidden rounded-lg border border-border bg-card p-0">
          {files.map((f) => (
            <FileItem key={f.importId} f={f} sample={sample} />
          ))}
        </ul>
      </section>

      {notices.length > 0 && (
        <section aria-labelledby="notices-title" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="notices-title" className="m-0 text-base font-semibold">
              {t('data.notices', { count: notices.length })}
            </h2>
            <DownloadList records={ds.imports} />
          </div>
          <ul className="m-0 list-none overflow-hidden rounded-lg border border-border bg-card p-0">
            {notices.map((n, i) => (
              <li key={i} className="flex gap-2.5 border-t border-border-muted px-4 py-3 text-sm first:border-t-0">
                {SEVERITY_ICON[n.severity]}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div>{n.text}</div>
                  <div className="text-xs text-muted-foreground">{n.file}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="runs-title" className="flex flex-col gap-2">
        <h2 id="runs-title" className="m-0 text-base font-semibold">
          {t('data.runs', { count: runs.length })}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <div role="table" aria-label={t('data.runs.label')} className="min-w-[640px] text-[13px]">
            <div role="row" className="grid grid-cols-6 border-b border-border text-xs font-semibold text-muted-foreground">
              {(['run', 'commit', 'branch', 'browser', 'time', 'tests'] as const).map((c) => (
                <div key={c} role="columnheader" className="min-w-0 px-4 py-3 text-center">
                  {t(`data.runs.col.${c}`)}
                </div>
              ))}
            </div>
            {shownRuns.map((r) => (
              <div key={r.runId} role="row" className="grid grid-cols-6 items-center border-t border-border-muted first:border-t-0">
                <div role="cell" className="px-4 py-3 text-center tabular-nums">{r.number}</div>
                <div role="cell" className="min-w-0 px-4 py-3 text-center font-mono">
                  <span className={r.labelled ? 'break-all' : undefined}>{r.commit}</span>
                  {r.labelled && <span className="ml-1.5 rounded-sm border border-border px-1 text-[11px] font-sans text-muted-foreground">{t('runs.commit.labelTag')}</span>}
                </div>
                <div role="cell" className="px-4 py-3 text-center">{r.branch}</div>
                <div role="cell" className="px-4 py-3 text-center">{r.browser}</div>
                <div role="cell" className="px-4 py-3 text-center tabular-nums">{r.time ? dateTime.format(new Date(r.time)) : t('wasted.none')}</div>
                <div role="cell" className="px-4 py-3 text-center tabular-nums">{r.tests}</div>
              </div>
            ))}
          </div>
        </div>
        {runs.length > FIRST_RUNS && !showAll && (
          <button
            type="button"
            aria-expanded="false"
            className={`${linkButton} h-7 self-start px-2 text-[13px] font-semibold`}
            onClick={() => setShowAll(true)}
          >
            {t('data.runs.showAll', { count: runs.length })}
          </button>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
        {sample ? (
          <>
            <div className="text-sm font-semibold">{t('header.sampleTag')}</div>
            <button type="button" className={`${secondaryButton} h-9 px-3.5 text-sm`} onClick={onExitSample}>
              {t('tests.banner.exitSample')}
            </button>
          </>
        ) : (
          <>
            <div className="text-sm">
              <div className="font-semibold">{t('data.remove.title')}</div>
              <div className="text-muted-foreground">{t('data.remove.body')}</div>
            </div>
            <button type="button" className={`${dangerButton} h-9 text-sm`} onClick={() => setConfirming(true)}>
              {t('data.remove.action')}
            </button>
          </>
        )}
      </section>

      <ClearDataDialog
        open={confirming}
        files={summary.files}
        runs={summary.runs}
        onKeep={() => setConfirming(false)}
        onConfirm={() => void clear()}
      />
    </div>
  );
}
