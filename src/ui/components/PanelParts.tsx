import { useId, useMemo, useState } from 'react';
import { orderRuns, runHistory } from '@/engine/view';
import type { Dataset } from '@/engine/types';
import { t, type CopyKey } from '../copy';
import {
  attemptKinds,
  shortSha,
  type FailureEntry,
  type RunSquareKind,
  type Row,
  noteFor,
} from '../data/selectors';
import { copyText } from '../lib/clipboard';
import { RunSquare } from './RunStrip';
import { secondaryButton } from './buttons';

const WORD: Record<RunSquareKind, CopyKey> = {
  pass: 'run.attempt.pass',
  fail: 'run.attempt.fail',
  retryPass: 'run.attempt.retry',
  skip: 'run.attempt.skip',
};
const LEGEND: { kind: RunSquareKind; key: CopyKey }[] = [
  { kind: 'pass', key: 'run.pass' },
  { kind: 'fail', key: 'run.fail' },
  { kind: 'retryPass', key: 'run.retryPass' },
  { kind: 'skip', key: 'run.skip' },
];

// DESIGN.md "File-header bar": file path and project in mono, and a diffstat of attempts.
export function FileHeaderBar({ file, project, passed, failed }: { file: string; project: string; passed: number; failed: number }) {
  const total = passed + failed;
  // Five squares split in proportion, at least one of each kind that exists.
  let green = total === 0 ? 0 : Math.round((5 * passed) / total);
  if (passed > 0) green = Math.max(1, green);
  if (failed > 0) green = Math.min(4, green);
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2">
      <span className="min-w-0 flex-1 font-mono text-xs break-all text-fg-secondary">
        {project ? t('panel.fileBar', { file, project }) : file}
      </span>
      <span role="img" aria-label={t('panel.diffstat', { passed, failed })} className="inline-flex items-center gap-1.5 text-xs tabular-nums">
        <strong className="text-status-stable">+{passed}</strong>
        <strong className="text-status-failing">−{failed}</strong>
        <span aria-hidden="true" className="inline-flex gap-0.5">
          {Array.from({ length: 5 }, (_, i) =>
            i < green ? (
              <span key={i} className="size-2 rounded-xs bg-status-stable" />
            ) : (
              <span key={i} className="box-border size-2 rounded-xs border-2 border-status-failing" />
            ),
          )}
        </span>
      </span>
    </div>
  );
}

// One column per run (from the engine's runHistory), grouped by commit, retries stacked, SHA beneath.
export function RunHistory({ ds, testId }: { ds: Dataset; testId: string }) {
  const [only, setOnly] = useState<'all' | 'failures'>('all');
  const id = useId();
  const model = useMemo(() => {
    const number = new Map(orderRuns(ds.runs).map((r, i) => [r.runId, i + 1]));
    const cells = runHistory(ds, testId);
    const commits = new Set(cells.map((c) => c.run.commit ?? c.run.runId)).size;
    const shown = only === 'all' ? cells : cells.filter((c) => c.attempts.includes('fail'));
    // Consecutive runs on one commit share a box.
    const groups: { sha: string; mixed: boolean; runs: typeof cells }[] = [];
    for (const c of shown) {
      const sha = shortSha(c.run.commit ?? c.run.runId);
      const last = groups.at(-1);
      if (last && last.sha === sha) last.runs.push(c);
      else groups.push({ sha, mixed: c.mixedCommit, runs: [c] });
    }
    return { number, groups, runs: cells.length, commits };
  }, [ds, testId, only]);

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 id={`${id}-title`} className="m-0 text-[15px] font-semibold">
          {t('panel.history.title', { runs: model.runs, commits: model.commits })}
        </h3>
        <label className="flex items-center gap-1.5 text-xs">
          {t('panel.history.show')}
          <select
            value={only}
            onChange={(e) => setOnly(e.target.value as 'all' | 'failures')}
            className="h-7 rounded-md border border-input bg-card px-1.5 text-xs"
          >
            <option value="all">{t('panel.history.filter.all')}</option>
            <option value="failures">{t('panel.history.filter.failures')}</option>
          </select>
        </label>
      </div>
      <div className="overflow-x-auto pb-1">
        <div role="list" aria-label={t('panel.history.list')} className="flex min-w-max gap-1.5">
          {model.groups.map((g, gi) => (
            <div
              key={gi}
              role="listitem"
              data-mixed={g.mixed}
              className={`flex flex-col items-center gap-1 rounded-sm border-[1.5px] p-1.5 ${g.mixed ? 'border-status-flaky' : 'border-transparent'}`}
            >
              <div className="flex gap-1">
                {g.runs.map((c) => {
                  const kinds = attemptKinds(c.attempts);
                  const attempts = kinds.map((k) => t(WORD[k])).join(', ');
                  const params = { n: model.number.get(c.run.runId)!, sha: g.sha, attempts };
                  return (
                    <div
                      key={c.run.runId}
                      role="img"
                      aria-label={c.mixedCommit ? t('panel.history.runLabel.mixed', params) : t('panel.history.runLabel', params)}
                      className="flex flex-col items-center gap-[3px]"
                    >
                      {kinds.map((k, i) => (
                        <RunSquare key={i} outcome={k} size={16} />
                      ))}
                    </div>
                  );
                })}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">{g.sha}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-3.5 text-xs text-fg-secondary">
        {LEGEND.map((l) => (
          <span key={l.kind} className="inline-flex items-center gap-[5px]">
            <RunSquare outcome={l.kind} size={14} />
            {t(l.key)}
          </span>
        ))}
        <span className="inline-flex items-center gap-[5px]">
          <span className="h-2.5 w-3.5 rounded-sm border-[1.5px] border-status-flaky" aria-hidden="true" />
          {t('panel.history.legend.mixed')}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">{t('panel.history.hint')}</div>
    </section>
  );
}

// "What this means" and "What to check next", split into a list; a trailing "Tip: …" sentence stays separate.
export function StatusNote({ row }: { row: Row }) {
  const id = useId();
  const note = noteFor(row);
  const next = t(note.next.key, note.next.params);
  const tipAt = next.indexOf(' Tip: ');
  const list = (tipAt === -1 ? next : next.slice(0, tipAt)).replace(/\.$/, '');
  const items = list.split(' · ');
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-2 rounded-lg bg-background px-4 py-3.5">
      <h3 id={`${id}-title`} className="m-0 text-[15px] font-semibold">
        {t('panel.note.title')}
      </h3>
      <p className="m-0 text-sm">{t(note.means.key, note.means.params)}</p>
      <div className="mt-1 text-sm font-semibold">{t('panel.note.next')}</div>
      {items.length > 1 ? (
        <ul className="m-0 flex list-disc flex-col gap-[3px] pl-[18px] text-sm text-fg-secondary">
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-fg-secondary">{list}.</p>
      )}
      {tipAt !== -1 && <div className="text-[13px] text-muted-foreground">{next.slice(tipAt + 1)}</div>}
    </section>
  );
}

const dateTime = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const MAX_LINES = 30;

// DESIGN.md "Diff hunk": the failed attempt as removed lines and the retry that passed as an added line.
export function LatestFailure({ failures }: { failures: FailureEntry[] }) {
  const id = useId();
  const [index, setIndex] = useState(failures.length - 1);
  const f = failures[index];
  if (!f) return null;
  const meta = { n: f.runNumber, sha: f.commit, a: f.attempt, total: f.total };
  const lines = [...f.message.split('\n'), ...f.stack.split('\n')].filter((l) => l.trim() !== '').slice(0, MAX_LINES);
  const secs = f.passedAfter?.durationMs == null ? null : (f.passedAfter.durationMs / 1000).toFixed(1);
  return (
    <section aria-labelledby={`${id}-title`} data-latest-failure className="flex flex-col gap-2">
      <h3 id={`${id}-title`} className="m-0 text-[15px] font-semibold">
        {t('panel.failure.title')}
      </h3>
      <div className="text-[13px] text-muted-foreground">
        {f.startedAt
          ? t('panel.failure.meta', { ...meta, date: dateTime.format(new Date(f.startedAt)) })
          : t('panel.failure.metaNoDate', meta)}
      </div>
      <div role="group" aria-label={t('panel.failure.diff')} className="overflow-hidden rounded-md border border-border">
        {f.passedAfter && (
          <div className="border-b border-accent-border bg-accent px-3 py-1 font-mono text-xs leading-5 text-fg-secondary">
            {t('panel.failure.hunk', { n: f.runNumber, a: f.attempt, b: f.passedAfter.attempt })}
          </div>
        )}
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[36px_40px_1fr] bg-diff-del font-mono text-xs leading-5">
            <span className="bg-diff-del-gutter pr-2 pl-1.5 text-right text-fg-secondary">{i + 1}</span>
            <span className="text-center text-[11px] text-status-failing">{t('panel.failure.sign.fail')}</span>
            <span className="pr-2 break-words whitespace-pre-wrap text-foreground">{line}</span>
          </div>
        ))}
        {f.passedAfter && secs !== null && (
          <div className="grid grid-cols-[36px_40px_1fr] bg-diff-add font-mono text-xs leading-5">
            <span className="bg-diff-add-gutter pr-2 pl-1.5 text-right text-fg-secondary">1</span>
            <span className="text-center text-[11px] text-status-stable">{t('panel.failure.sign.pass')}</span>
            <span className="pr-2 break-words whitespace-pre-wrap text-foreground">
              {t('panel.failure.passedAfter', { a: f.passedAfter.attempt, s: secs })}
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className={`${secondaryButton} h-8 px-2.5 text-[13px]`}
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          {t('panel.failure.prev')}
        </button>
        <button
          type="button"
          className={`${secondaryButton} h-8 px-2.5 text-[13px]`}
          onClick={() => void copyText([f.message, f.stack].filter(Boolean).join('\n'))}
        >
          {t('panel.failure.copy')}
        </button>
      </div>
    </section>
  );
}

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

// Collapsible "How the score is built".
export function ScoreDetails({ row, ds }: { row: Row; ds: Dataset }) {
  const { score } = row;
  const runs = new Map(ds.runs.map((r) => [r.runId, r.startedAt]));
  const when = (runId: string | null) => {
    const at = runId ? runs.get(runId) : null;
    return at ? day.format(new Date(at)) : t('wasted.none');
  };
  return (
    <details className="border-t border-border-muted pt-3">
      <summary className="cursor-pointer text-sm font-semibold">{t('panel.score.title')}</summary>
      <ul className="m-0 mt-2.5 flex list-none flex-col gap-1.5 p-0 text-[13px] text-fg-secondary">
        <li>{t('panel.score.score', { s: Math.round(score.score) })}</li>
        <li>{t('panel.score.mixed', { m: score.mixedCommits, g: row.commits })}</li>
        <li>{t('panel.score.flip', { f: score.flipRate.toFixed(2) })}</li>
        <li>{t('panel.score.seen', { first: when(score.firstSeenRunId), last: when(score.lastFailedRunId) })}</li>
      </ul>
    </details>
  );
}
