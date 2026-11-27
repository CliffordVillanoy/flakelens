import type { Attempt, Dataset, Failure, ImportRecord, Run, Test } from '@/engine/types';

// Test-only builder: each entry says "in run r{run}, test {test} failed with {message}". Runs are r0..r(n-1), one file
// each ("run-0.json" ...), oldest first, one day apart. Tests sit under the suite "checkout".
export interface Fail {
  run: number;
  test: string;
  message: string;
  retry?: number;
  stack?: string;
}

export function buildGroups(fails: Fail[], runCount = 8): Dataset {
  const imports: ImportRecord[] = Array.from({ length: runCount }, (_, i) => ({
    importId: `i${i}`,
    fileName: `run-${i}.json`,
    importedAt: '2026-11-20T00:00:00.000Z',
    result: 'success',
    counts: { found: 1, imported: 1, notImported: 0 },
    notices: [],
    runIds: [`r${i}`],
  }));
  const runs: Run[] = Array.from({ length: runCount }, (_, i) => ({
    runId: `r${i}`,
    importId: `i${i}`,
    commit: `c${i}`,
    startedAt: `2026-11-${String(10 + (i % 18)).padStart(2, '0')}T10:00:00.000Z`,
    order: i,
  }));
  const tests = new Map<string, Test>();
  const attempts: Attempt[] = [];
  const failures: Failure[] = [];
  fails.forEach((f, i) => {
    if (!tests.has(f.test)) tests.set(f.test, { testId: f.test, testKey: f.test, file: 'a.spec.ts', suitePath: ['checkout'], title: f.test, project: '' });
    attempts.push({ attemptId: `a${i}`, runId: `r${f.run}`, testId: f.test, repeatIndex: 0, retryIndex: f.retry ?? 0, status: 'fail', durationMs: 1000 });
    failures.push({ attemptId: `a${i}`, message: f.message, stack: f.stack ?? '' });
  });
  return { imports, runs, tests: [...tests.values()], attempts, failures };
}
