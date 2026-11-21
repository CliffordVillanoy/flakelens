import 'fake-indexeddb/auto';
import { it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import Dexie from 'dexie';
import { parsePlaywrightReport } from '@/engine/import/playwright';
import { addImport, emptyDataset } from '@/engine/dataset';
import { clearAll, loadDataset, saveImport, storageAvailable } from './db';

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
