import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parsePlaywrightReport } from './import/playwright';
import { addImport, emptyDataset, setCommitLabel, MAX_LABEL } from './dataset';

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
