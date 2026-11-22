import 'fake-indexeddb/auto';
import { it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import Dexie from 'dexie';
import { parsePlaywrightReport } from '@/engine/import/playwright';
import { addImport, emptyDataset } from '@/engine/dataset';
import { clearAll, loadDataset, loadStored, saveImport, storageAvailable } from './db';

const read = (f: string) => readFileSync(`fixtures/lab/${f}`, 'utf8');
const parse = (f: string, order: number, importedAt = '2026-11-21T10:00:00.000Z') =>
  parsePlaywrightReport(read(f), { fileName: f, importedAt, order, commitLabel: 'c0' });

beforeEach(() => clearAll());
afterEach(() => vi.restoreAllMocks());

it('save then load gives the same dataset as adding the imports in memory', async () => {
  const a = parse('run-00.json', 0);
  const b = parse('run-01.json', 1);
  await saveImport(a);
  await saveImport(b);
  expect(await loadDataset()).toEqual(addImport(addImport(emptyDataset(), a), b));
});

it('a repeated importId is made unique', async () => {
  const a = parse('run-00.json', 0);
  await saveImport(a);
  await saveImport(a); // same file, same importedAt: same importId
  const ds = await loadDataset();
  expect(ds.imports).toHaveLength(2);
  expect(new Set(ds.imports.map((i) => i.importId)).size).toBe(2);
  expect(ds.runs).toHaveLength(1);
  expect(ds.imports[1]!.notices.map((n) => n.code)).toContain('import.dupeRun');
});

it('clearAll empties storage', async () => {
  await saveImport(parse('run-00.json', 0));
  await clearAll();
  expect(await loadDataset()).toEqual(emptyDataset());
});

it('storageAvailable is true with IndexedDB and false when it cannot open', async () => {
  expect(await storageAvailable()).toBe(true);
  vi.spyOn(Dexie.prototype, 'open').mockRejectedValue(new Error('InvalidStateError'));
  expect(await storageAvailable()).toBe(false);
});

// Writes rows straight into the store, the way an older or newer app version (or another script) could.
const raw = async (rows: object[]) => {
  const d = new Dexie('flakelens');
  await d.open();
  await d.table('imports').bulkAdd(rows);
  const all = async () => d.table('imports').toArray();
  return { all, close: () => d.close() };
};

it('rows that are not valid results are skipped, valid rows are kept', async () => {
  const a = parse('run-00.json', 0);
  await saveImport(a);
  const w = await raw([
    { importId: 'x1', seq: 10, result: 'nope' },
    { importId: 'x2', seq: 11, result: { record: { importId: 'x2' } } }, // no runs
    { importId: 'x3', seq: 12 }, // no result at all
    { importId: 'x4', seq: 13, result: { ...a, runs: [{ runId: 5 }] } }, // wrong types
    { importId: 'x5', seq: 14, schemaVersion: 'one', result: a }, // version is not a number
  ]);
  const { dataset, skipped } = await loadStored();
  expect(skipped).toBe(5);
  expect(dataset).toEqual(addImport(emptyDataset(), a));
  expect(await w.all()).toHaveLength(6); // skipped, never deleted
  w.close();
});

it('a row with a higher schemaVersion is skipped but kept; a row with no schemaVersion is version 1', async () => {
  const a = parse('run-00.json', 0);
  const b = parse('run-01.json', 1);
  const w = await raw([
    { importId: a.record.importId, seq: 0, result: a }, // saved by v0: no schemaVersion
    { importId: b.record.importId, seq: 1, schemaVersion: 2, result: b },
  ]);
  const { dataset, skipped } = await loadStored();
  expect(skipped).toBe(1);
  expect(dataset).toEqual(addImport(emptyDataset(), a));
  expect(await w.all()).toHaveLength(2);
  w.close();
});

it('new rows are saved with schemaVersion 1', async () => {
  await saveImport(parse('run-00.json', 0));
  const w = await raw([]);
  expect((await w.all()).map((r) => r.schemaVersion)).toEqual([1]);
  w.close();
});

it('when every row is bad the dataset is empty and all are counted as skipped', async () => {
  const w = await raw([
    { importId: 'a', seq: 0, result: 1 },
    { importId: 'b', seq: 1, result: null },
  ]);
  const { dataset, skipped } = await loadStored();
  expect(dataset).toEqual(emptyDataset());
  expect(skipped).toBe(2);
  w.close();
});
