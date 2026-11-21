// Pure view models for the Tests screen: evidence sentences, wasted time, health counts, groups, filter and search.
import type { Dataset, Label, Test, TestScore } from '@/engine/types';
import { runHistories, type RunCell } from '@/engine/view';
import { t, type CopyKey } from '../copy';

export const GROUP_ORDER: Label[] = ['flaky', 'suspect', 'failing', 'stable', 'insufficient'];
const STRIP_RUNS = 12;

export interface Row {
  score: TestScore;
  test: Test;
  cells: RunCell[]; // last 12 runs, oldest first
  evidence: { key: CopyKey; params: Record<string, string | number> };
  commits: number; // distinct commits the test ran on (Mixed commits column: "m of commits")
  lastFailedAt: string | null; // start time of the last run where it failed, if the run has one
  flakyRank: number | null; // fix-priority position among Flaky tests; unchanged by display sorting
}

export type SortKey = 'rank' | 'test' | 'wasted';
export interface Sort {
  key: SortKey;
  dir: 'asc' | 'desc';
}
export const RANK_SORT: Sort = { key: 'rank', dir: 'asc' };

const shortCommit = (cell: RunCell) => (cell.run.commit ?? cell.run.runId).slice(0, 7);

// One why.* template per label (04-ux-copy "Why sentences"); the number always comes first.
function evidence(score: TestScore, cells: RunCell[]): Row['evidence'] {
  const n = score.runs;
  const counted = cells.filter((c) => c.outcome !== 'skip');
  const failedRuns = counted.filter((c) => c.outcome === 'fail').length;
  switch (score.label) {
    case 'flaky': {
      // Without commit info (or with one run) every commit is one run, so the evidence is the retry.
      if (counted.length <= 1 || counted.every((c) => c.run.commit === null))
        return { key: 'why.retry', params: { r: counted.filter((c) => c.outcome === 'retryPass').length, n } };
      const commits = new Set(counted.map((c) => c.run.commit ?? c.run.runId)).size;
      return { key: 'why.mixed', params: { m: score.mixedCommits, g: commits } };
    }
    case 'suspect':
      return { key: 'why.suspect', params: { f: Math.round(score.flipRate * (score.attempts - 1)), n } };
    case 'failing': {
      if (score.wasFlakyEarlier) {
        let start = counted.length;
        while (start > 0 && counted[start - 1]!.outcome === 'fail') start--;
        const streak = counted.length - start;
        if (streak > 0) return { key: 'why.failingWasFlaky', params: { x: streak, sha: shortCommit(counted[start]!) } };
      }
      return { key: 'why.failing', params: { x: failedRuns, n } };
    }
    case 'stable':
      return failedRuns === 0 ? { key: 'why.stable', params: { n } } : { key: 'why.failing', params: { x: failedRuns, n } };
    case 'insufficient':
      return { key: 'why.insufficient', params: { count: score.attempts } };
  }
}

export function tableRows(ds: Dataset, ranked: TestScore[]): Row[] {
  const tests = new Map(ds.tests.map((x) => [x.testId, x]));
  const histories = runHistories(ds);
  const runs = new Map(ds.runs.map((r) => [r.runId, r]));
  let flaky = 0;
  return ranked.map((score) => {
    const cells = histories.get(score.testId) ?? [];
    const counted = cells.filter((c) => c.outcome !== 'skip');
    return {
      score,
      test: tests.get(score.testId)!,
      cells: cells.slice(-STRIP_RUNS),
      evidence: evidence(score, cells),
      commits: new Set(counted.map((c) => c.run.commit ?? c.run.runId)).size,
      lastFailedAt: score.lastFailedRunId ? (runs.get(score.lastFailedRunId)?.startedAt ?? null) : null,
      flakyRank: score.label === 'flaky' ? ++flaky : null,
    };
  });
}

// Under a minute shows one decimal, and any wasted time shows at least 0.1 (never "0.0 min").
export const formatMinutes = (ms: number) =>
  ms >= 60_000 ? String(Math.round(ms / 60_000)) : ms > 0 ? Math.max(0.1, ms / 60_000).toFixed(1) : '0';

// Measured minutes for Flaky, an estimate for Unproven, a dash for everything else (04-ux-copy "Wasted time cell").
export function wastedText(s: TestScore): string {
  if (s.label === 'flaky' && s.wastedMs > 0) return t('wasted.measured', { min: formatMinutes(s.wastedMs) });
  if (s.label === 'suspect' && s.possibleWastedMs > 0) return t('wasted.estimate', { min: formatMinutes(s.possibleWastedMs) });
  return t('wasted.none');
}

export function health(rows: Row[]) {
  const counts = Object.fromEntries(GROUP_ORDER.map((l) => [l, 0])) as Record<Label, number>;
  let wastedMs = 0;
  let possibleMs = 0;
  for (const { score } of rows) {
    counts[score.label]++;
    if (score.label === 'flaky') wastedMs += score.wastedMs;
    if (score.label === 'suspect') possibleMs += score.possibleWastedMs;
  }
  return { counts, total: rows.length, wastedMs, possibleMs };
}

export function datasetSummary(ds: Dataset) {
  return {
    tests: ds.tests.length,
    files: ds.imports.filter((i) => i.result !== 'failed').length,
    runs: ds.runs.length,
    commits: new Set(ds.runs.map((r) => r.commit ?? r.runId)).size,
    notImported: ds.imports.reduce((n, i) => n + i.counts.notImported, 0),
  };
}

export function groupRows(rows: Row[]) {
  return GROUP_ORDER.map((label) => ({ label, rows: rows.filter((r) => r.score.label === label) })).filter((g) => g.rows.length > 0);
}

export const isLabel = (s: string): s is Label => (GROUP_ORDER as string[]).includes(s);

// Status from the URL (unknown means All) and a case-insensitive search over test name, suite path and file.
export function filterRows(rows: Row[], { status, q }: { status: string; q: string }): Row[] {
  const needle = q.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (!isLabel(status) || r.score.label === status) &&
      (needle === '' || [r.test.title, ...r.test.suitePath, r.test.file].some((s) => s.toLowerCase().includes(needle))),
  );
}

export function countLine(count: number, status: string, q: string, sort: Sort = RANK_SORT): string {
  const query = q.trim();
  const order = t(`sort.${sort.key}`);
  if (isLabel(status)) {
    const name = t(`status.${status}`);
    return query
      ? t('tests.count.statusSearch', { count, status: name, query, sort: order })
      : t('tests.count.status', { count, status: name, sort: order });
  }
  return query ? t('tests.count.search', { count, query, sort: order }) : t('tests.count.all', { count, sort: order });
}

// Wasted time as the table shows it: measured for Flaky, the estimate for Unproven, nothing otherwise.
const wastedValue = (s: TestScore) => (s.label === 'flaky' ? s.wastedMs : s.label === 'suspect' ? s.possibleWastedMs : -1);

/** Re-sorts rows; groups are formed afterwards, so the group order never changes. Ties keep rank order. */
export function sortRows(rows: Row[], sort: Sort): Row[] {
  if (sort.key === 'rank') return rows;
  const sign = sort.dir === 'asc' ? 1 : -1;
  const by =
    sort.key === 'test'
      ? (a: Row, b: Row) => a.test.title.localeCompare(b.test.title, 'en')
      : (a: Row, b: Row) => wastedValue(a.score) - wastedValue(b.score);
  return [...rows].sort((a, b) => sign * by(a, b));
}

// Markdown export: escape what would change the meaning in Markdown, and a leading = + - @ that a
// spreadsheet would run as a formula if the list is pasted there.
// Control characters (newlines, tabs, line separators) become spaces first, so no field can start a new
// list line, a spreadsheet cell or row, and the leading-character escape sees the real first character.
export const escapeMd = (s: string) =>
  s
    // eslint-disable-next-line no-control-regex -- matching control characters is the point here
    .replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, ' ')
    .trim()
    .replace(/[\\`|*_[\]<>]/g, '\\$&')
    .replace(/^[=+\-@]/, '\\$&');

const TOP_FLAKY = 10;
/** "1. name — evidence — wasted" for the top Flaky tests, in fix-priority order. */
export function topFlakyMarkdown(rows: Row[]): string {
  return rows
    .filter((r) => r.score.label === 'flaky')
    .slice(0, TOP_FLAKY)
    .map((r, i) => `${i + 1}. ${[r.test.title, t(r.evidence.key, r.evidence.params), wastedText(r.score)].map(escapeMd).join(' — ')}`)
    .join('\n');
}
