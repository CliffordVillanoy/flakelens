// Test-only builder: each entry is one run, in order; each array is one test's attempts by retry index.
import type { AttemptStatus, Dataset } from '../types';

export function buildDataset(
  runs: Array<{ commit?: string; tests: Record<string, AttemptStatus[]> }>,
  durationMs: number | null = 1000,
): Dataset {
  const ds: Dataset = { imports: [], runs: [], tests: [], attempts: [], failures: [] };
  const seen = new Set<string>();
  runs.forEach((spec, order) => {
    const runId = `run${order}`;
    ds.runs.push({ runId, importId: `imp${order}`, commit: spec.commit ?? null, startedAt: null, order });
    for (const [testId, statuses] of Object.entries(spec.tests)) {
      if (!seen.has(testId)) {
        seen.add(testId);
        ds.tests.push({ testId, testKey: testId, file: 'x.spec.ts', suitePath: [], title: testId, project: '' });
      }
      statuses.forEach((status, retryIndex) =>
        ds.attempts.push({ attemptId: `${runId}:${testId}:${retryIndex}`, runId, testId, retryIndex, status, durationMs }),
      );
    }
  });
  return ds;
}
