import type { Dataset, ImportResult, Notice } from './types';

export const emptyDataset = (): Dataset => ({ imports: [], runs: [], tests: [], attempts: [], failures: [] });

// Pure: returns a new dataset. Run IDs are content hashes, so a re-imported file maps to a known runId.
export function addImport(ds: Dataset, res: ImportResult): Dataset {
  const known = new Set(ds.runs.map((r) => r.runId));
  const runs = res.runs.filter((r) => !known.has(r.runId));
  const kept = new Set(runs.map((r) => r.runId));
  const dropped = res.runs.filter((r) => known.has(r.runId));

  const dupeNotices: Notice[] = dropped.map((r) => ({
    code: 'import.dupeRun',
    severity: 'info',
    params: {},
    location: { run: r.runId },
  }));
  const record = {
    ...res.record,
    notices: [...res.record.notices, ...dupeNotices],
    runIds: res.record.runIds.filter((id) => kept.has(id)),
  };

  const attempts = res.attempts.filter((a) => kept.has(a.runId));
  const attemptIds = new Set(attempts.map((a) => a.attemptId));
  const testIds = new Set(ds.tests.map((t) => t.testId));

  return {
    imports: [...ds.imports, record],
    runs: [...ds.runs, ...runs],
    tests: [...ds.tests, ...res.tests.filter((t) => !testIds.has(t.testId))],
    attempts: [...ds.attempts, ...attempts],
    failures: [...ds.failures, ...res.failures.filter((f) => attemptIds.has(f.attemptId))],
  };
}
