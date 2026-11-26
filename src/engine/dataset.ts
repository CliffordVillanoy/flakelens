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

// ---- Removing one file (DEV-33) ----

/** Pure. Drops the import, its runs, attempts and failures, its label (it lives on the record) and any test only it held. */
export function removeImport(ds: Dataset, importId: string): Dataset {
  if (!ds.imports.some((i) => i.importId === importId)) return ds;
  const runs = ds.runs.filter((r) => r.importId !== importId);
  const kept = new Set(runs.map((r) => r.runId));
  const attempts = ds.attempts.filter((a) => kept.has(a.runId));
  const attemptIds = new Set(attempts.map((a) => a.attemptId));
  const used = new Set(attempts.map((a) => a.testId));
  return {
    imports: ds.imports.filter((i) => i.importId !== importId),
    runs,
    tests: ds.tests.filter((t) => used.has(t.testId)),
    attempts,
    failures: ds.failures.filter((f) => attemptIds.has(f.attemptId)),
  };
}

/** What one file holds, shaped like the result it was saved from, so undo can put it back. Null: no such import. */
export function importSlice(ds: Dataset, importId: string): { result: ImportResult; index: number } | null {
  const index = ds.imports.findIndex((i) => i.importId === importId);
  if (index === -1) return null;
  const runs = ds.runs.filter((r) => r.importId === importId);
  const runIds = new Set(runs.map((r) => r.runId));
  const attempts = ds.attempts.filter((a) => runIds.has(a.runId));
  const attemptIds = new Set(attempts.map((a) => a.attemptId));
  const testIds = new Set(attempts.map((a) => a.testId));
  return {
    index,
    result: {
      record: ds.imports[index]!,
      runs,
      tests: ds.tests.filter((t) => testIds.has(t.testId)),
      attempts,
      failures: ds.failures.filter((f) => attemptIds.has(f.attemptId)),
    },
  };
}

/** Pure. Puts a removed file back where it was in the list (the list order is the file order on Loaded data). */
export function restoreImport(ds: Dataset, slice: ImportResult, index: number): Dataset {
  if (ds.imports.some((i) => i.importId === slice.record.importId)) return ds;
  const testIds = new Set(ds.tests.map((t) => t.testId));
  const imports = [...ds.imports];
  imports.splice(Math.min(index, imports.length), 0, slice.record);
  return {
    imports,
    runs: [...ds.runs, ...slice.runs],
    tests: [...ds.tests, ...slice.tests.filter((t) => !testIds.has(t.testId))],
    attempts: [...ds.attempts, ...slice.attempts],
    failures: [...ds.failures, ...slice.failures],
  };
}

export interface RemovalImpact {
  runs: number; // runs this file owns, removed with it
  tests: number; // tests with attempts in those runs: their status or evidence can change
  label: string | null;
  kept: number; // runs this file also held that another file already owns, so they stay
  keptIn: string[]; // names of those files
  last: boolean;
}

/** What the confirmation tells the person before a file goes. */
export function removalImpact(ds: Dataset, importId: string): RemovalImpact {
  const record = ds.imports.find((i) => i.importId === importId);
  const own = new Set(ds.runs.filter((r) => r.importId === importId).map((r) => r.runId));
  const testIds = new Set(ds.attempts.filter((a) => own.has(a.runId)).map((a) => a.testId));
  const owners = new Map(ds.runs.map((r) => [r.runId, r.importId]));
  const names = new Map(ds.imports.map((i) => [i.importId, i.fileName]));
  const dupes = (record?.notices ?? []).filter((n) => n.code === 'import.dupeRun' && n.location?.run !== undefined);
  const keptIn = [...new Set(dupes.map((n) => names.get(owners.get(n.location!.run!) ?? '')).filter((n): n is string => !!n))];
  return {
    runs: own.size,
    tests: testIds.size,
    label: record?.commitLabel ?? null,
    kept: dupes.length,
    keptIn,
    last: ds.imports.length === 1 && ds.imports[0]!.importId === importId,
  };
}
