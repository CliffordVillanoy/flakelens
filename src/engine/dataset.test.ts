import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parsePlaywrightReport } from './import/playwright';
import { addImport, emptyDataset, setCommitLabel, MAX_LABEL, removeImport, removalImpact, importSlice, restoreImport } from './dataset';

const read = (f: string) => readFileSync(`fixtures/playwright/${f}`, 'utf8');
const opts = { fileName: 'run.json', importedAt: '2026-11-20T12:00:00.000Z', order: 0 };
const base = () => parsePlaywrightReport(read('valid-basic.json'), opts);

it('adds an import', () => {
  const ds = addImport(emptyDataset(), base());
  expect(ds.imports).toHaveLength(1);
  expect(ds.runs).toHaveLength(1);
  expect(ds.attempts).toHaveLength(4);
});

it('does not double a run imported twice, even under another commit label', () => {
  let ds = addImport(emptyDataset(), base());
  ds = addImport(ds, parsePlaywrightReport(read('valid-basic.json'), { ...opts, commitLabel: 'other' }));
  expect(ds.runs).toHaveLength(1);
  expect(ds.attempts).toHaveLength(4);
  expect(ds.failures).toHaveLength(1);
  const dupe = ds.imports[1]!.notices.find((n) => n.code === 'import.dupeRun');
  expect(dupe?.severity).toBe('info');
  expect(ds.imports[1]!.runIds).toEqual([]);
});

it('keeps failed imports as records only', () => {
  const ds = addImport(emptyDataset(), parsePlaywrightReport('', opts));
  expect(ds.imports).toHaveLength(1);
  expect(ds.runs).toHaveLength(0);
  expect(ds.tests).toHaveLength(0);
  expect(ds.attempts).toHaveLength(0);
  expect(ds.failures).toHaveLength(0);
});

it('unions tests across runs', () => {
  let ds = addImport(emptyDataset(), base());
  ds = addImport(ds, parsePlaywrightReport(read('no-start-time.json'), { ...opts, order: 1 }));
  expect(ds.tests).toHaveLength(3);
  expect(ds.runs).toHaveLength(2);
});

it('does not change its input dataset', () => {
  const before = addImport(emptyDataset(), base());
  const snapshot = structuredClone(before);
  addImport(before, parsePlaywrightReport(read('no-start-time.json'), { ...opts, order: 1 }));
  addImport(before, base());
  expect(before).toEqual(snapshot);
});

// ---- setCommitLabel (DEV-32) ----

const two = () => {
  let ds = addImport(emptyDataset(), base());
  ds = addImport(ds, parsePlaywrightReport(read('no-start-time.json'), { ...opts, fileName: 'b.json', order: 1 }));
  return ds;
};
const commits = (ds: ReturnType<typeof two>, importId: string) => ds.runs.filter((r) => r.importId === importId).map((r) => r.commit);

it('setCommitLabel puts the label on every run of that import and on its record, and touches nothing else', () => {
  const ds = two();
  const [a, b] = ds.imports.map((i) => i.importId) as [string, string];
  const out = setCommitLabel(ds, a, 'c0');
  expect(commits(out, a)).toEqual(commits(ds, a).map(() => 'c0'));
  expect(out.imports.find((i) => i.importId === a)!.commitLabel).toBe('c0');
  expect(commits(out, b)).toEqual(commits(ds, b));
  expect(out.imports.find((i) => i.importId === b)!.commitLabel).toBeUndefined();
  expect(out.attempts).toBe(ds.attempts);
  expect(ds.imports[0]!.commitLabel).toBeUndefined(); // pure: the input is unchanged
  expect(commits(ds, a).every((c) => c === null)).toBe(true);
});

it('two files with the same label count as one commit', () => {
  let ds = two();
  for (const i of ds.imports) ds = setCommitLabel(ds, i.importId, 'c0');
  expect(new Set(ds.runs.map((r) => r.commit))).toEqual(new Set(['c0']));
});

it('an empty or blank label removes the label and gives back the commit from the report', () => {
  const ds = two();
  const a = ds.imports[0]!.importId;
  const withReport = { ...ds, runs: ds.runs.map((r) => (r.importId === a ? { ...r, commit: 'abc1234' } : r)) };
  const labelled = setCommitLabel(withReport, a, 'mine');
  expect(commits(labelled, a)).toEqual(commits(withReport, a).map(() => 'mine'));
  const cleared = setCommitLabel(labelled, a, '   ');
  expect(commits(cleared, a)).toEqual(commits(withReport, a));
  expect(cleared.imports[0]!.commitLabel).toBeUndefined();
  expect(cleared.runs.every((r) => !('reportCommit' in r))).toBe(true);
});

it('relabelling keeps the original report commit', () => {
  const ds = two();
  const a = ds.imports[0]!.importId;
  const withReport = { ...ds, runs: ds.runs.map((r) => (r.importId === a ? { ...r, commit: 'abc1234' } : r)) };
  const again = setCommitLabel(setCommitLabel(withReport, a, 'x'), a, 'y');
  expect(commits(setCommitLabel(again, a, ''), a)).toEqual(commits(withReport, a));
});

it('the label is plain text: trimmed, control characters removed, at most 100 characters', () => {
  const ds = two();
  const a = ds.imports[0]!.importId;
  const nul = String.fromCharCode(0);
  const esc = String.fromCharCode(27);
  expect(setCommitLabel(ds, a, `  c${nul}0${esc}[31m \n`).imports[0]!.commitLabel).toBe('c0[31m');
  expect(MAX_LABEL).toBe(100);
  expect(setCommitLabel(ds, a, 'x'.repeat(250)).imports[0]!.commitLabel).toBe('x'.repeat(100));
});

it('an unknown import id changes nothing', () => {
  const ds = two();
  expect(setCommitLabel(ds, 'nope', 'c0')).toBe(ds);
});

it('cleaning a hostile label is linear', () => {
  const ds = two();
  const hostile = (String.fromCharCode(7) + ' ').repeat(500_000);
  const t0 = performance.now();
  setCommitLabel(ds, ds.imports[0]!.importId, hostile);
  expect(performance.now() - t0).toBeLessThan(500);
});

// ---- removeImport (DEV-33) ----
const lab = (f: string, order: number, label?: string) =>
  parsePlaywrightReport(readFileSync(`fixtures/lab/${f}`, 'utf8'), { fileName: f, importedAt: `2026-11-2${order}T10:00:00.000Z`, order, commitLabel: label });
const three = () => {
  let ds = emptyDataset();
  for (const [i, f] of ['run-00.json', 'run-01.json', 'run-02.json'].entries()) ds = addImport(ds, lab(f, i));
  return ds;
};

it('removeImport deletes the import, its runs, attempts, failures, label and tests only it had', () => {
  let ds = three();
  const [a, b] = ds.imports.map((i) => i.importId) as [string, string];
  ds = setCommitLabel(ds, a, 'c0');
  const out = removeImport(ds, a);
  expect(out.imports.map((i) => i.importId)).not.toContain(a);
  expect(out.imports).toHaveLength(2);
  expect(out.runs.some((r) => r.importId === a)).toBe(false);
  const left = new Set(out.runs.map((r) => r.runId));
  expect(out.attempts.every((x) => left.has(x.runId))).toBe(true);
  const attemptIds = new Set(out.attempts.map((x) => x.attemptId));
  expect(out.failures.every((f) => attemptIds.has(f.attemptId))).toBe(true);
  expect(out.tests.every((x) => out.attempts.some((y) => y.testId === x.testId))).toBe(true);
  expect(out.imports.every((i) => i.commitLabel === undefined)).toBe(true);
  expect(out.runs.filter((r) => r.importId === b)).toEqual(ds.runs.filter((r) => r.importId === b));
  expect(ds.imports).toHaveLength(3); // pure
});

it('removing every file gives the empty dataset', () => {
  let ds = three();
  for (const i of [...ds.imports]) ds = removeImport(ds, i.importId);
  expect(ds).toEqual(emptyDataset());
});

it('an unknown id changes nothing', () => {
  const ds = three();
  expect(removeImport(ds, 'nope')).toBe(ds);
});

it('a file whose runs were already in an earlier file: removing it keeps the earlier runs', () => {
  let ds = addImport(emptyDataset(), lab('run-00.json', 0));
  ds = addImport(ds, { ...lab('run-00.json', 1), record: { ...lab('run-00.json', 1).record, importId: 'again' } });
  const owner = ds.imports[0]!;
  const out = removeImport(ds, 'again');
  expect(out.runs).toEqual(ds.runs);
  expect(out.attempts).toEqual(ds.attempts);
  expect(out.imports).toEqual([owner]);
});

it('removalImpact counts runs and tests, names the label, and finds runs kept by another file', () => {
  let ds = addImport(emptyDataset(), lab('run-00.json', 0));
  ds = addImport(ds, { ...lab('run-00.json', 1), record: { ...lab('run-00.json', 1).record, importId: 'again' } });
  ds = addImport(ds, lab('run-01.json', 2));
  const second = ds.imports[2]!.importId;
  ds = setCommitLabel(ds, second, 'c0');
  const plain = removalImpact(ds, second);
  expect(plain).toMatchObject({ runs: 1, label: 'c0', last: false, kept: 0, keptIn: [] });
  expect(plain.tests).toBeGreaterThan(0);
  const dupe = removalImpact(ds, 'again');
  expect(dupe).toMatchObject({ runs: 0, kept: 1, keptIn: ['run-00.json'], label: null });
  const only = removalImpact(removeImport(removeImport(ds, 'again'), second), ds.imports[0]!.importId);
  expect(only.last).toBe(true);
});

it('restoreImport puts a removed file back in its place with everything it had', () => {
  let ds = three();
  const mid = ds.imports[1]!.importId;
  ds = setCommitLabel(ds, mid, 'c0');
  const { result, index } = importSlice(ds, mid)!;
  const back = restoreImport(removeImport(ds, mid), result, index);
  const key = (d: typeof ds) => ({
    imports: d.imports.map((i) => i.importId),
    runs: d.runs.map((r) => r.runId).sort(),
    attempts: d.attempts.map((a) => a.attemptId).sort(),
    tests: d.tests.map((x) => x.testId).sort(),
    failures: d.failures.map((f) => f.attemptId).sort(),
  });
  expect(key(back)).toEqual(key(ds));
  expect(back.imports[1]!.commitLabel).toBe('c0');
  expect(back.runs.find((r) => r.importId === mid)!.commit).toBe('c0');
  expect(restoreImport(ds, result, index)).toBe(ds); // already there
  expect(importSlice(ds, 'nope')).toBeNull();
});
