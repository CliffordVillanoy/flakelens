import { DEFAULT_CONFIG, type EngineConfig } from '../config';
import type { Attempt, Dataset, Run, Test } from '../types';
import { chiSquareTable, fisherExact, oddsRatio } from './stats';

// Does a test fail more on one browser, shard, OS, hour or project? (DEV-40, spec section 10.) Data only: the wording is DEV-41.
// Every number the screen prints is in the result, so it recomputes nothing. A link is a clue, never a cause.
//
// Counts are attempts (retries included), skipped attempts left out. The odds ratio and the Fisher p treat attempts as
// independent; a failed run with a failed retry counts twice, so the p is optimistic for tests that retry a lot.
// Hour is the UTC hour of the run start. Project is read across the tests that share a testKey, because the importer
// makes one Test per Playwright project: inside one test the project never changes.

export const DIMENSIONS = ['browser', 'shard', 'os', 'hour', 'project'] as const;
export type Dimension = (typeof DIMENSIONS)[number];
export type CorrelationStatus = 'finding' | 'none' | 'notEnough' | 'missing';
export type Strength = 'Strong' | 'Moderate' | 'Weak';

export interface RateRow {
  failed: number;
  attempts: number;
  rate: number; // 0..1
}
export interface ValueRow extends RateRow {
  value: string;
}
/** The numbers behind "not enough data": the thresholds, what the test has, and the smallest group. */
export interface NotEnoughReason {
  minAttempts: number;
  minFails: number;
  minGroup: number;
  attempts: number;
  fails: number;
  smallestGroup: number;
}

export interface CorrelationResult {
  dimension: Dimension;
  status: CorrelationStatus;
  strength?: Strength; // only on a finding
  highlightedValue?: string; // the value that fails most; only on a finding
  values: ValueRow[]; // one row per value, in natural order; empty when the dimension is missing
  others: RateRow; // every attempt that is not the highlighted value
  pointsHigher: number; // highlighted rate minus the others' rate, in percentage points
  oddsRatio: number; // highlighted against the others, each cell +0.5
  adjustedP: number; // Bonferroni across the dimensions tested for this test, at most 1
  comparisons: number; // how many dimensions were tested for this test
  reason?: NotEnoughReason; // only when status is 'notEnough'
}

/** Strong, Moderate or Weak from the adjusted p and the fail-rate difference (0..1); null is "no clear link". */
export function strengthOf(adjustedP: number, diff: number, c: EngineConfig): Strength | null {
  if (adjustedP < c.corrStrongP && diff >= c.corrStrongDiff) return 'Strong';
  if (adjustedP < c.corrModerateP && diff >= c.corrModerateDiff) return 'Moderate';
  if (adjustedP < c.corrWeakP) return 'Weak';
  return null;
}

const natural = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true });
const rate = (failed: number, attempts: number) => (attempts === 0 ? 0 : failed / attempts);
const NO_ROW: RateRow = { failed: 0, attempts: 0, rate: 0 };
const pad2 = (n: number) => String(n).padStart(2, '0');

function runValue(dimension: Exclude<Dimension, 'project'>, run: Run): string | null {
  switch (dimension) {
    case 'browser':
      return run.browser || null;
    case 'os':
      return run.os || null;
    case 'shard':
      return run.shard ? `${run.shard.current} of ${run.shard.total}` : null;
    case 'hour': {
      if (!run.startedAt) return null;
      const ms = Date.parse(run.startedAt);
      return Number.isNaN(ms) ? null : pad2(new Date(ms).getUTCHours());
    }
  }
}

interface Raw {
  result: CorrelationResult;
  p: number | null; // set when the dimension was really tested
  diff: number; // 0..1
}

function analyse(dimension: Dimension, groups: Map<string, { failed: number; attempts: number }>, c: EngineConfig): Raw {
  const values: ValueRow[] = [...groups]
    .sort(([a], [b]) => natural(a, b))
    .map(([value, g]) => ({ value, failed: g.failed, attempts: g.attempts, rate: rate(g.failed, g.attempts) }));
  const base = { dimension, values, others: NO_ROW, pointsHigher: 0, oddsRatio: 1, adjustedP: 1, comparisons: 0 };
  if (values.length < 2) return { result: { ...base, status: 'missing', values: [] }, p: null, diff: 0 };

  const attempts = values.reduce((n, v) => n + v.attempts, 0);
  const fails = values.reduce((n, v) => n + v.failed, 0);
  const smallestGroup = Math.min(...values.map((v) => v.attempts));
  if (attempts < c.corrMinAttempts || fails < c.corrMinFails || smallestGroup < c.corrMinGroup) {
    const reason = { minAttempts: c.corrMinAttempts, minFails: c.corrMinFails, minGroup: c.corrMinGroup, attempts, fails, smallestGroup };
    return { result: { ...base, status: 'notEnough', reason }, p: null, diff: 0 };
  }

  const hl = values.reduce((best, v) => (v.rate > best.rate ? v : best));
  const others: RateRow = { failed: fails - hl.failed, attempts: attempts - hl.attempts, rate: rate(fails - hl.failed, attempts - hl.attempts) };
  const diff = hl.rate - others.rate;
  const withNumbers = { ...base, others, pointsHigher: diff * 100, oddsRatio: oddsRatio(hl.failed, hl.attempts - hl.failed, others.failed, others.attempts - others.failed) };

  let p: number | null;
  if (values.length === 2) p = fisherExact(hl.failed, hl.attempts - hl.failed, others.failed, others.attempts - others.failed);
  else p = chiSquareTable(values.map((v) => [v.failed, v.attempts - v.failed] as const))?.p ?? null; // null: an expected count is below 5, so not tested
  if (p === null) return { result: { ...withNumbers, status: 'none' }, p: null, diff };
  return { result: { ...withNumbers, status: 'none', highlightedValue: hl.value }, p, diff };
}

/** Builds the lookups once; the returned function correlates one test, so a screen can work lazily per test. */
export function createCorrelator(ds: Dataset, config: EngineConfig = DEFAULT_CONFIG): (testId: string) => CorrelationResult[] {
  const runById = new Map<string, Run>(ds.runs.map((r) => [r.runId, r]));
  const testById = new Map<string, Test>(ds.tests.map((t) => [t.testId, t]));
  const siblings = new Map<string, Test[]>();
  for (const t of ds.tests) {
    const list = siblings.get(t.testKey);
    if (list) list.push(t);
    else siblings.set(t.testKey, [t]);
  }
  const byTest = new Map<string, Attempt[]>();
  for (const a of ds.attempts) {
    if (a.status === 'skip') continue;
    const list = byTest.get(a.testId);
    if (list) list.push(a);
    else byTest.set(a.testId, [a]);
  }

  return (testId) => {
    const test = testById.get(testId);
    const raws: Raw[] = DIMENSIONS.map((dimension) => {
      const groups = new Map<string, { failed: number; attempts: number }>();
      const add = (value: string | null, a: Attempt) => {
        if (value === null) return;
        const g = groups.get(value);
        const failed = a.status === 'fail' ? 1 : 0;
        if (g) {
          g.failed += failed;
          g.attempts++;
        } else groups.set(value, { failed, attempts: 1 });
      };
      if (test) {
        if (dimension === 'project') {
          for (const s of siblings.get(test.testKey) ?? [test]) for (const a of byTest.get(s.testId) ?? []) add(s.project || null, a);
        } else {
          for (const a of byTest.get(testId) ?? []) {
            const run = runById.get(a.runId);
            if (run) add(runValue(dimension, run), a);
          }
        }
      }
      return analyse(dimension, groups, config);
    });

    // Bonferroni across the dimensions that were really tested for this test. A dimension that is missing, has not enough
    // data, or was skipped (chi-square) is not a comparison, so project counts only when the test has a sibling in another project.
    const comparisons = raws.filter((r) => r.p !== null).length;
    return raws.map(({ result, p, diff }) => {
      if (p === null) return { ...result, comparisons };
      const adjustedP = Math.min(1, p * comparisons);
      const strength = diff > 0 ? strengthOf(adjustedP, diff, config) : null;
      if (strength === null) {
        return { ...result, highlightedValue: undefined, adjustedP, comparisons };
      }
      return { ...result, status: 'finding' as const, strength, adjustedP, comparisons };
    });
  };
}

export function correlate(ds: Dataset, testId: string, config: EngineConfig = DEFAULT_CONFIG): CorrelationResult[] {
  return createCorrelator(ds, config)(testId);
}

/** Every test, eagerly. About 5,000 tests x 50 runs fit well inside the 2 s budget (see the timing test). */
export function correlateAll(ds: Dataset, config: EngineConfig = DEFAULT_CONFIG): Map<string, CorrelationResult[]> {
  const one = createCorrelator(ds, config);
  return new Map(ds.tests.map((t) => [t.testId, one(t.testId)]));
}
