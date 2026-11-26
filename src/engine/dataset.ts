import type { Dataset, ImportResult, Notice, Run } from './types';

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

export const MAX_LABEL = 100;

// Plain text: control characters dropped (a loop, so cost stays linear), trimmed, cut to MAX_LABEL.
export function cleanLabel(raw: string): string {
  let out = '';
  for (const ch of raw.slice(0, 10_000)) {
    const c = ch.codePointAt(0)!;
    if (c < 32 || (c >= 127 && c <= 159)) continue;
    out += ch;
  }
  return out.trim().slice(0, MAX_LABEL);
}

// Pure. A label stands in for the commit of every run in that import; the commit from the report is kept in
// reportCommit, so removing the label gives it back. Empty label: removes it. Unknown import: same dataset.
export function setCommitLabel(ds: Dataset, importId: string, label: string): Dataset {
  if (!ds.imports.some((i) => i.importId === importId)) return ds;
  const clean = cleanLabel(label);
  const runs = ds.runs.map((r): Run => {
    if (r.importId !== importId) return r;
    const { reportCommit, ...rest } = r;
    const original = reportCommit !== undefined ? reportCommit : r.commit;
    if (clean === '') return { ...rest, commit: original };
    return { ...rest, commit: clean, reportCommit: original };
  });
  const imports = ds.imports.map((i) => {
    if (i.importId !== importId) return i;
    const next = { ...i };
    delete next.commitLabel;
    return clean === '' ? next : { ...next, commitLabel: clean };
  });
  return { ...ds, runs, imports };
}
