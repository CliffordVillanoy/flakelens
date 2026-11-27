import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Copy } from 'lucide-react';
import { createCorrelator } from '@/engine/correlate/correlate';
import { t } from '../copy';
import { useStore } from '../data/store';
import { corrBoxes, fullStats, logEntries, timelineRows, type LogEntry } from '../data/full';
import { evidenceFor } from '../data/log';
import { failuresFor, tableRows, type Row } from '../data/selectors';
import { Correlations } from '../components/Correlations';
import { EvidenceChip } from '../components/EvidenceChip';
import { LogViewer } from '../components/LogViewer';
import { FileHeaderBar, ScoreDetails, StatusNote } from '../components/PanelParts';
import { RunSquare, RunStrip } from '../components/RunStrip';
import { StatusPill } from '../components/StatusPill';
import { linkButton, secondaryButton } from '../components/buttons';
import { copyText } from '../lib/clipboard';
import { useCause } from '../lib/useCause';
import { cleanText } from '../lib/safeText';
import { MissingTest } from './TestPanel';

// Board 13: one test's whole story on one page. One column, sections in the order a person asks: what is it, how did it
// run, why did it fail, what does it depend on. Back to tests keeps the list's filters in its link.
const FIRST_RUNS = 5;
const dateTime = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const seconds = (ms: number) => `${ms >= 10_000 ? Math.round(ms / 1000) : (ms / 1000).toFixed(1)} s`;

const listHref = (query: URLSearchParams) => {
  const p = new URLSearchParams();
  for (const k of ['status', 'q']) {
    const v = query.get(k);
    if (v) p.set(k, v);
  }
  const s = p.toString();
  return `#/tests${s ? `?${s}` : ''}`;
};

export function FullTest({ testId, query }: { testId: string; query: URLSearchParams }) {
  const { dataset: ds, ranked } = useStore();
  const row = useMemo(() => tableRows(ds, ranked).find((r) => r.score.testId === testId), [ds, ranked, testId]);
  if (!row)
    return (
      <div id="results" tabIndex={-1} className="pg mx-auto flex w-full max-w-[1232px] flex-col gap-4 px-6 py-4 outline-none">
        <MissingTest listHref="#/tests" />
      </div>
    );
  return <Page row={row} query={query} />;
}

function Page({ row, query }: { row: Row; query: URLSearchParams }) {
  const { dataset: ds } = useStore();
  const { score, test } = row;
  const title = useRef<HTMLHeadingElement>(null);
  const name = cleanText([...test.suitePath, test.title].join(' › '));
  const failures = useMemo(() => failuresFor(ds, score.testId), [ds, score.testId]);
  const passed = ds.attempts.filter((a) => a.testId === score.testId && a.status === 'pass').length;
  const failed = ds.attempts.filter((a) => a.testId === score.testId && a.status === 'fail').length;
  const stats = useMemo(() => fullStats(row, ds), [row, ds]);
  const { cause, tip, groups } = useCause(ds, score.testId, failures.length > 0);
  const boxes = useMemo(() => corrBoxes(createCorrelator(ds)(score.testId)), [ds, score.testId]);
  const entries = useMemo(() => logEntries(ds, score.testId), [ds, score.testId]);
  const [picked, setPicked] = useState<string | null>(null);
  const [jump, setJump] = useState<{ line: number; tick: number } | undefined>();

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [score.testId]);

  // The log opens on the newest failure that has text, else on the newest.
  const entry: LogEntry | undefined = entries.find((e) => e.key === picked) ?? entries.find((e) => e.raw !== '') ?? entries[0];
  const runLabel = (e: LogEntry) => t('log.run', { run: e.name, n: e.attempt });
  const showLogOf = (runId: string) => {
    const e = entries.find((x) => x.runId === runId && x.raw !== '') ?? entries.find((x) => x.runId === runId);
    if (e) {
      setPicked(e.key);
      document.getElementById('full-log')?.scrollIntoView?.({ block: 'start' });
    }
  };

  return (
    <div id="results" tabIndex={-1} className="pg mx-auto flex w-full max-w-[1232px] flex-col gap-5 px-6 py-4 outline-none max-sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <a href={listHref(query)} className="inline-flex min-h-8 items-center gap-1 text-[13px]">
          <ArrowLeft size={14} aria-hidden="true" />
          {t('full.back')}
        </a>
        <button type="button" className={`${secondaryButton} h-8 px-2.5 text-[13px]`} onClick={() => void copyText(name, t('full.copyName.done'))}>
          <Copy size={14} aria-hidden="true" />
          {t('full.copyName')}
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 ref={title} tabIndex={-1} className="m-0 font-mono text-xl font-semibold break-words outline-none">
            {name}
          </h1>
          <StatusPill label={score.label} />
        </div>
        <FileHeaderBar file={test.file} project={test.project} passed={passed} failed={failed} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {t('full.last12')}
          <RunStrip cells={row.cells} />
        </div>
      </div>

      <div role="group" aria-label={t('full.stats.label')} className="grid grid-cols-3 gap-3 max-sm:grid-cols-2">
        {[
          { value: t('full.stat.failed', { failed: stats.failed, total: stats.total }), label: t('full.stat.failed.label') },
          { value: String(stats.retry), label: t('full.stat.retry.label') },
          { value: stats.wasted, label: t('full.stat.wasted.label') },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-3">
            <span className="text-xl font-semibold tabular-nums">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      <StatusNote row={row} cause={tip} />

      <Timeline ds={ds} testId={score.testId} hasLog={(runId) => entries.some((e) => e.runId === runId)} onOpenLog={showLogOf} />

      <section id="full-log" aria-labelledby="log-title" className="flex scroll-mt-4 flex-col gap-3">
        <h2 id="log-title" className="m-0 text-[17px] font-semibold">
          {t('log.title')}
        </h2>
        {!entry ? (
          <Notice title={t('log.noFailures.title')} body={t('log.noFailures.body')} />
        ) : (
          <>
            <label className="flex flex-wrap items-center gap-2 text-sm">
              <span className="sr-only">{t('log.pick')}</span>
              <select
                aria-label={t('log.pick')}
                value={entry.key}
                onChange={(e) => setPicked(e.target.value)}
                className="h-8 max-w-full rounded-md border border-input bg-card px-2 text-[13px]"
              >
                {entries.map((e) => (
                  <option key={e.key} value={e.key}>
                    {runLabel(e)}
                  </option>
                ))}
              </select>
            </label>
            {entry.raw === '' ? (
              <Notice title={t('log.none.title')} body={t('log.none.body')} />
            ) : (
              <LogSection key={entry.key} entry={entry} test={name} run={runLabel(entry)} jump={jump} onJump={(line) => setJump((j) => ({ line, tick: (j?.tick ?? 0) + 1 }))} cause={cause} groups={groups} />
            )}
          </>
        )}
      </section>

      <Correlations boxes={boxes} />
      <ScoreDetails row={row} ds={ds} />
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-5 py-6 text-center">
      <h3 className="m-0 text-[15px] font-semibold">{title}</h3>
      <p className="m-0 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

// The chips and the viewer for one failed attempt. The evidence is the failure's own quoted lines, checked against the raw text.
function LogSection({ entry, test, run, jump, onJump, cause, groups }: {
  entry: LogEntry;
  test: string;
  run: string;
  jump?: { line: number; tick: number };
  onJump: (line: number) => void;
  cause: ReturnType<typeof useCause>['cause'];
  groups: ReturnType<typeof useCause>['groups'];
}) {
  const quoted = useMemo(
    () => (groups && cause ? evidenceFor(entry.raw, groups.evidenceLines(entry.raw, cause.group, cause.category)) : []),
    [groups, cause, entry.raw],
  );
  return (
    <>
      {quoted.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quoted.map((q) => (
            <EvidenceChip key={q.line} quote={q} onJump={onJump} />
          ))}
        </div>
      )}
      <LogViewer raw={entry.raw} test={test} run={run} evidence={quoted} jump={jump} />
    </>
  );
}

function Timeline({ ds, testId, hasLog, onOpenLog }: { ds: ReturnType<typeof useStore.getState>['dataset']; testId: string; hasLog: (runId: string) => boolean; onOpenLog: (runId: string) => void }) {
  const id = useId();
  const [all, setAll] = useState(false);
  const rows = useMemo(() => timelineRows(ds, testId), [ds, testId]);
  const shown = all ? rows : rows.slice(0, FIRST_RUNS);
  const grid = 'grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.8fr)_4.5rem] items-center gap-3 px-4 max-sm:grid-cols-[minmax(0,1fr)_auto]';
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-2">
      <h2 id={`${id}-title`} className="m-0 text-[17px] font-semibold">
        {t('full.timeline')}
      </h2>
      <div role="table" aria-label={t('full.timeline')} className="overflow-hidden rounded-lg border border-border bg-card text-[13px]">
        <div role="row" className={`${grid} border-b border-border py-2.5 text-xs font-semibold text-muted-foreground max-sm:hidden`}>
          {(['run', 'commit', 'when', 'result', 'time'] as const).map((c) => (
            <div key={c} role="columnheader" className={c === 'time' ? 'text-right' : ''}>
              {t(`full.timeline.col.${c}`)}
            </div>
          ))}
        </div>
        {shown.map((r) => (
          <div key={r.runId} role="row" className={`${grid} border-t border-border-muted py-2.5 first:border-t-0 max-sm:gap-y-1`}>
            <div role="cell" className="min-w-0 font-mono break-all">
              {hasLog(r.runId) ? (
                <button type="button" aria-label={t('full.timeline.openLog', { run: r.name })} className={`${linkButton} text-left font-mono break-all`} onClick={() => onOpenLog(r.runId)}>
                  {r.name}
                </button>
              ) : (
                r.name
              )}
            </div>
            <div role="cell" className="min-w-0 font-mono max-sm:order-3">
              <span className={r.labelled ? 'break-all' : undefined}>{r.commit}</span>
              {r.labelled && <span className="ml-1.5 rounded-sm border border-border px-1 font-sans text-[11px] text-muted-foreground">{t('runs.commit.labelTag')}</span>}
            </div>
            <div role="cell" className="text-muted-foreground tabular-nums max-sm:order-4">
              {r.startedAt ? dateTime.format(new Date(r.startedAt)) : t('wasted.none')}
            </div>
            <div role="cell" className="flex min-w-0 items-center gap-2 max-sm:order-5 max-sm:col-span-2">
              <span aria-hidden="true" className="inline-flex gap-0.5">
                {r.kinds.map((k, i) => (
                  <RunSquare key={i} outcome={k} size={12} />
                ))}
              </span>
              {r.result}
            </div>
            <div role="cell" className="text-right tabular-nums max-sm:order-2">
              {r.ms === null ? t('wasted.none') : seconds(r.ms)}
            </div>
          </div>
        ))}
      </div>
      {rows.length > FIRST_RUNS && !all && (
        <button type="button" aria-expanded="false" className={`${linkButton} h-7 self-start px-2 text-[13px] font-semibold`} onClick={() => setAll(true)}>
          {t('full.timeline.showAll', { count: rows.length })}
        </button>
      )}
    </section>
  );
}
