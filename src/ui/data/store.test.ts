import 'fake-indexeddb/auto';
import { it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import Dexie from 'dexie';
import { emptyDataset } from '@/engine/dataset';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import { clearAll as clearDb, loadDataset } from './db';
import { parseFiles } from './worker';
import { useStore } from './store';

vi.mock('./parser', () => ({
  workerParser: () => ({ parseFiles: async (...a: Parameters<typeof parseFiles>) => parseFiles(...a), terminate: () => {} }),
}));

const file = (f: string) => new File([readFileSync(`fixtures/lab/${f}`, 'utf8')], f);
const initial = useStore.getState();

beforeEach(async () => {
  await clearDb();
  useStore.setState(initial, true);
  vi.stubGlobal('fetch', async (url: string) => new Response(readFileSync(`public/${url}`, 'utf8')));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('restore with an empty database is mode empty, storage ok', async () => {
  await useStore.getState().restore();
  expect(useStore.getState()).toMatchObject({ mode: 'empty', storage: 'ok', ranked: [] });
});

it('imports, persists and ranks; restore brings the data back', async () => {
  await useStore.getState().restore();
  await useStore.getState().importFiles([file('run-00.json'), file('run-01.json')]);
  const s = useStore.getState();
  expect(s.mode).toBe('user');
  expect(s.importing).toBeNull();
  expect(s.ranked).toEqual(rankTests(scoreTests(s.dataset), s.dataset.tests));
  expect(s.lastImport?.records).toHaveLength(2);
  useStore.setState(initial, true);
  await useStore.getState().restore();
  expect(useStore.getState().dataset).toEqual(s.dataset);
  expect(useStore.getState().mode).toBe('user');
});

it('with IndexedDB unavailable, import works in memory and storage is off', async () => {
  vi.spyOn(Dexie.prototype, 'open').mockRejectedValue(new Error('blocked'));
  await useStore.getState().restore();
  expect(useStore.getState().storage).toBe('off');
  await useStore.getState().importFiles([file('run-00.json')]);
  expect(useStore.getState()).toMatchObject({ mode: 'user', storage: 'off' });
  expect(useStore.getState().dataset.runs).toHaveLength(1);
});

it('sample mode never writes to storage, and own files replace the sample', async () => {
  await useStore.getState().restore();
  await useStore.getState().startSample();
  expect(useStore.getState().mode).toBe('sample');
  expect(useStore.getState().dataset.runs.length).toBeGreaterThan(0);
  expect(await loadDataset()).toEqual(emptyDataset());
  await useStore.getState().importFiles([file('run-00.json')]);
  expect(useStore.getState().mode).toBe('user');
  expect(useStore.getState().dataset.runs).toHaveLength(1);
});

it('exitSample goes back to the stored data', async () => {
  await useStore.getState().restore();
  await useStore.getState().startSample();
  await useStore.getState().exitSample();
  expect(useStore.getState()).toMatchObject({ mode: 'empty', dataset: emptyDataset() });
});

it('clearAll removes stored and in-memory data', async () => {
  await useStore.getState().restore();
  await useStore.getState().importFiles([file('run-00.json')]);
  await useStore.getState().clearAll();
  expect(useStore.getState()).toMatchObject({ mode: 'empty', dataset: emptyDataset(), ranked: [] });
  expect(await loadDataset()).toEqual(emptyDataset());
});
