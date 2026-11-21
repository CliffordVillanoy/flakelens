// Pure view helpers shared by scoring and the UI (run order, per-run history of one test).
import type { Attempt, AttemptStatus, Dataset, Run } from './types';

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// Chronological order as a strict total order (spec 11): an untimed run takes the start time of the timed run
// before it in import order ('' if none), so it stays next to the run it followed; ties break by import order.
export function orderRuns(runs: Run[]): Run[] {
  let last = '';
  const keyed = [...runs]
    .sort((a, b) => a.order - b.order || cmp(a.runId, b.runId))
    .map((run) => ({ run, time: (last = run.startedAt ?? last) }));
  return keyed
    .sort((a, b) => cmp(a.time, b.time) || a.run.order - b.run.order || cmp(a.run.runId, b.run.runId))
    .map((k) => k.run);
}

export interface RunCell {
  run: Run;
  attempts: AttemptStatus[];
  // retryPass: the run has both a failed and a passed attempt (passed after a retry or a repeat).
  outcome: 'pass' | 'fail' | 'retryPass' | 'skip';
  mixedCommit: boolean; // the run's commit has both a pass and a fail for this test
}

const commitOf = (run: Run) => run.commit ?? run.runId;

/** Every test's history in one pass over the attempts (large datasets: no scan per test). Oldest first. */
export function runHistories(ds: Dataset): Map<string, RunCell[]> {
  const byTest = new Map<string, Map<string, Attempt[]>>();
  for (const a of ds.attempts) {
    let runs = byTest.get(a.testId);
    if (!runs) byTest.set(a.testId, (runs = new Map()));
    const list = runs.get(a.runId);
    if (list) list.push(a);
    else runs.set(a.runId, [a]);
  }
  const ordered = orderRuns(ds.runs);
  const out = new Map<string, RunCell[]>();
  for (const [testId, byRun] of byTest) out.set(testId, cellsFor(ordered, byRun));
  return out;
}

function cellsFor(ordered: Run[], byRun: Map<string, Attempt[]>): RunCell[] {
  const cells = ordered
    .filter((run) => byRun.has(run.runId))
    .map((run) => {
      const attempts = byRun
        .get(run.runId)!
        .sort((a, b) => a.repeatIndex - b.repeatIndex || a.retryIndex - b.retryIndex)
        .map((a) => a.status);
      const pass = attempts.includes('pass');
      const fail = attempts.includes('fail');
      const outcome: RunCell['outcome'] = pass && fail ? 'retryPass' : fail ? 'fail' : pass ? 'pass' : 'skip';
      return { run, attempts, outcome, mixedCommit: false };
    });
  const seen = new Map<string, Set<AttemptStatus>>();
  for (const c of cells) {
    const s = seen.get(commitOf(c.run)) ?? new Set();
    c.attempts.forEach((a) => s.add(a));
    seen.set(commitOf(c.run), s);
  }
  for (const c of cells) {
    const s = seen.get(commitOf(c.run))!;
    c.mixedCommit = s.has('pass') && s.has('fail');
  }
  return cells;
}

/** One cell per run the test appears in, oldest first. */
export function runHistory(ds: Dataset, testId: string): RunCell[] {
  const byRun = new Map<string, Attempt[]>();
  for (const a of ds.attempts) {
    if (a.testId !== testId) continue;
    const list = byRun.get(a.runId);
    if (list) list.push(a);
    else byRun.set(a.runId, [a]);
  }
  return cellsFor(orderRuns(ds.runs), byRun);
}

/** The newest n cells, still oldest first (the table's "Last 12 runs" strip). */
export const lastRuns = (ds: Dataset, testId: string, n = 12): RunCell[] => runHistory(ds, testId).slice(-n);
