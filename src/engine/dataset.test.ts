import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parsePlaywrightReport } from './import/playwright';
import { addImport, emptyDataset } from './dataset';

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
