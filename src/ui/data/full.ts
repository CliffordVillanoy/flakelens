import { failureText } from '@/engine/cause/classify';
import type { CorrelationResult, Dimension, Strength } from '@/engine/correlate/correlate';
import type { Attempt, Dataset } from '@/engine/types';
import { orderRuns, runHistory } from '@/engine/view';
import { t, type CopyKey } from '../copy';
import { cleanText } from '../lib/safeText';
import { attemptKinds, shortSha, wastedText, type Row, type RunSquareKind } from './selectors';

// View models of the full test page (board 13, DEV-41): the stats, the run timeline, the failed attempts whose text the
// log viewer shows, and the correlation boxes. Plain data and sentences; the components only draw them.

export interface FullStats {
  failed: number;
  total: number; // passed and failed attempts; skipped ones are not counted
  retry: number; // attempts that passed after an earlier failed attempt in the same run
  wasted: string;
}

export function fullStats(row: Row, ds: Dataset): FullStats {
  const byRun = new Map<string, Attempt[]>();
  for (const a of ds.attempts) {
    if (a.testId !== row.score.testId) continue;
    const list = byRun.get(a.runId);
    if (list) list.push(a);
    else byRun.set(a.runId, [a]);
  }
  let failed = 0;
  let total = 0;
  let retry = 0;
  for (const list of byRun.values()) {
    list.sort((a, b) => a.repeatIndex - b.repeatIndex || a.retryIndex - b.retryIndex);
    for (const kind of attemptKinds(list.map((a) => a.status))) {
      if (kind === 'skip') continue;
      total++;
      if (kind === 'fail') failed++;
      if (kind === 'retryPass') retry++;
    }
  }
  return { failed, total, retry, wasted: wastedText(row.score) };
}

const WORD: Record<RunSquareKind, CopyKey> = { pass: 'run.attempt.pass', fail: 'run.attempt.fail', retryPass: 'run.attempt.retry', skip: 'run.attempt.skip' };
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Passed", "Failed, then passed on retry", "Failed twice"; anything else lists each attempt. */
export function resultWords(kinds: RunSquareKind[]): string {
  if (kinds.every((k) => k === 'pass')) return t('run.pass');
  if (kinds.length === 2 && kinds[0] === 'fail' && kinds[1] === 'retryPass') return t('full.result.failedRetry');
  if (kinds.every((k) => k === 'fail')) {
    if (kinds.length === 1) return t('run.fail');
    return kinds.length === 2 ? t('full.result.failedTwice') : t('full.result.failedMany', { n: kinds.length });
  }
  return capital(kinds.map((k) => t(WORD[k])).join(', '));
}

export interface TimelineRow {
  runId: string;
  number: number; // chronological position, 1-based (the number the test panel uses)
  name: string; // the report file the run came from
  commit: string; // 7 characters of a commit, or a typed label in full
  labelled: boolean;
  startedAt: string | null;
  kinds: RunSquareKind[];
  result: string;
  ms: number | null; // the attempts' own run time added up; null when no attempt has one
}

const fileNames = (ds: Dataset) => new Map(ds.imports.map((i) => [i.importId, i.fileName]));

/** One row per run the test appears in, newest first. */
export function timelineRows(ds: Dataset, testId: string): TimelineRow[] {
  const number = new Map(orderRuns(ds.runs).map((r, i) => [r.runId, i + 1]));
  const names = fileNames(ds);
  const attempts = new Map<string, Attempt[]>();
  for (const a of ds.attempts) {
    if (a.testId !== testId) continue;
    const list = attempts.get(a.runId);
    if (list) list.push(a);
    else attempts.set(a.runId, [a]);
  }
  return runHistory(ds, testId)
    .map((c): TimelineRow => {
      const { run } = c;
      const kinds = attemptKinds(c.attempts);
      const durations = (attempts.get(run.runId) ?? []).map((a) => a.durationMs).filter((d): d is number => d !== null);
      const labelled = run.reportCommit !== undefined;
      return {
        runId: run.runId,
        number: number.get(run.runId)!,
        name: cleanText(names.get(run.importId) ?? run.runId),
        commit: labelled && run.commit ? cleanText(run.commit) : shortSha(run.commit ?? run.runId),
        labelled,
        startedAt: run.startedAt,
        kinds,
        result: resultWords(kinds),
        ms: durations.length === 0 ? null : durations.reduce((n, d) => n + d, 0),
      };
    })
    .reverse();
}

export interface LogEntry {
  key: string; // attempt id
  runId: string;
  runNumber: number;
  name: string; // the report file
  commit: string;
  attempt: number; // 1-based within the run
  total: number; // attempts of this test in the run
  raw: string; // the text the classifier reads (stack when it starts with the message, else both); empty when the report had none
}

/** Every failed attempt of a test, newest run first and the later attempt first inside a run. The text is raw: it is masked where it is shown or copied. */
export function logEntries(ds: Dataset, testId: string): LogEntry[] {
  const names = fileNames(ds);
  const failures = new Map(ds.failures.map((f) => [f.attemptId, f]));
  const byRun = new Map<string, Attempt[]>();
  for (const a of ds.attempts) {
    if (a.testId !== testId) continue;
    const list = byRun.get(a.runId);
    if (list) list.push(a);
    else byRun.set(a.runId, [a]);
  }
  const out: LogEntry[] = [];
  orderRuns(ds.runs).forEach((run, i) => {
    const list = byRun.get(run.runId)?.sort((a, b) => a.repeatIndex - b.repeatIndex || a.retryIndex - b.retryIndex);
    list?.forEach((a, k) => {
      if (a.status !== 'fail') return;
      const f = failures.get(a.attemptId);
      out.push({
        key: a.attemptId,
        runId: run.runId,
        runNumber: i + 1,
        name: cleanText(names.get(run.importId) ?? run.runId),
        commit: shortSha(run.commit ?? run.runId),
        attempt: k + 1,
        total: list.length,
        raw: f ? failureText(f.message, f.stack) : '',
      });
    });
  });
  return out.reverse();
}

// ---- correlations ----

export interface CorrBar {
  value: string;
  counts: string; // "7 of 8 · 88%"
  pct: number; // 0..100, the bar's width
  highlighted: boolean;
}
export interface CorrBox {
  dimension: Dimension;
  label: string;
  status: CorrelationResult['status'];
  strength?: Strength;
  strengthLabel?: string;
  text: string; // the one plain sentence
  bars: CorrBar[]; // findings only
  how: string | null; // the closed "How this was worked out" block, findings only
  open: boolean; // the strongest finding opens; other findings stay closed
}

const SHOWN_VALUE = 120;
const MAX_BARS = 6;
const STRENGTH_KEY: Record<Strength, CopyKey> = { Strong: 'corr.strength.strong', Moderate: 'corr.strength.moderate', Weak: 'corr.strength.weak' };
const shown = (dimension: Dimension, value: string) =>
  dimension === 'hour' ? t('corr.hour.value', { hour: value }) : cleanText(value).slice(0, SHOWN_VALUE);
const pctOf = (rate: number) => Math.round(rate * 100);
const formatP = (p: number) => (p < 0.001 ? '<0.001' : p.toFixed(3));
const formatOdds = (or: number) => (or >= 10 ? String(Math.round(or)) : or.toFixed(1));

function sentence(r: CorrelationResult): string {
  const { dimension: d } = r;
  if (r.status === 'missing') return t(`corr.missing.${d}` as CopyKey);
  if (r.status === 'notEnough') {
    const x = r.reason!;
    return x.attempts >= x.minAttempts && x.fails >= x.minFails
      ? t('corr.notEnough.group', { minGroup: x.minGroup, smallest: x.smallestGroup })
      : t('corr.notEnough', { minAttempts: x.minAttempts, minFails: x.minFails, attempts: x.attempts, fails: x.fails });
  }
  if (r.status === 'none') {
    const list = [...r.values]
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 3)
      .map((v) => t('corr.none.item', { value: shown(d, v.value), failed: v.failed, attempts: v.attempts }));
    return t('corr.none', { list: list.join(', ') });
  }
  const hl = r.values.find((v) => v.value === r.highlightedValue)!;
  return t('corr.finding', { value: shown(d, hl.value), a: hl.failed, b: hl.attempts, c: r.others.failed, d: r.others.attempts });
}

/** The boxes of the Correlations section, one per dimension in the order the engine returns them. Missing and not-enough boxes never print numbers from the result. */
export function corrBoxes(results: CorrelationResult[]): CorrBox[] {
  let strongest = -1;
  results.forEach((r, i) => {
    if (r.status !== 'finding') return;
    const best = results[strongest];
    if (!best || r.adjustedP < best.adjustedP || (r.adjustedP === best.adjustedP && r.pointsHigher > best.pointsHigher)) strongest = i;
  });
  return results.map((r, i): CorrBox => {
    const box: CorrBox = { dimension: r.dimension, label: t(`corr.dim.${r.dimension}` as CopyKey), status: r.status, text: sentence(r), bars: [], how: null, open: false };
    if (r.status !== 'finding' || !r.strength) return box;
    const bars = [...r.values]
      .sort((a, b) => b.rate - a.rate || b.attempts - a.attempts)
      .slice(0, MAX_BARS)
      .map((v): CorrBar => ({
        value: shown(r.dimension, v.value),
        counts: t('corr.bar', { failed: v.failed, attempts: v.attempts, pct: pctOf(v.rate) }),
        pct: pctOf(v.rate),
        highlighted: v.value === r.highlightedValue,
      }));
    const params = { value: shown(r.dimension, r.highlightedValue!), or: formatOdds(r.oddsRatio), p: formatP(r.adjustedP), n: r.comparisons, strength: t(STRENGTH_KEY[r.strength]) };
    return {
      ...box,
      strength: r.strength,
      strengthLabel: t(STRENGTH_KEY[r.strength]),
      bars,
      how: t(r.values.length === 2 ? 'corr.how.fisher' : 'corr.how.chi', params),
      open: i === strongest,
    };
  });
}
