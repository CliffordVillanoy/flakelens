import 'fake-indexeddb/auto';
import { it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import Dexie from 'dexie';
import { emptyDataset } from '@/engine/dataset';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import { clearAll as clearDb, loadDataset, loadStored } from './db';
import { parseFiles } from './worker';
import { useStore } from './store';

const gate = vi.hoisted(() => ({ wait: Promise.resolve() as Promise<void> }));
vi.mock('./parser', () => ({
  workerParser: () => ({
    parseFiles: async (...a: Parameters<typeof parseFiles>) => {
      await gate.wait;
      return parseFiles(...a);
    },
    terminate: () => {},
  }),
}));

const file = (f: string) => new File([readFileSync(`fixtures/lab/${f}`, 'utf8')], f);
const initial = useStore.getState();

beforeEach(async () => {
  gate.wait = Promise.resolve();
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

it('Clear all data while an import is running: the import is dropped, nothing comes back', async () => {
  await useStore.getState().restore();
  await useStore.getState().importFiles([file('run-00.json')]);
  let release!: () => void;
  gate.wait = new Promise<void>((r) => (release = r));
  const running = useStore.getState().importFiles([file('run-01.json'), file('run-02.json')]);
  await vi.waitFor(() => expect(useStore.getState().importing).not.toBeNull());
  const clearing = useStore.getState().clearAll();
  release();
  await Promise.all([running, clearing]);
  expect(useStore.getState()).toMatchObject({ mode: 'empty', importing: null });
  expect(useStore.getState().dataset.runs).toHaveLength(0);
  expect((await loadDataset()).runs).toHaveLength(0);
});

it('Exit sample leaves sample mode at once, before the stored data is read back', async () => {
  await useStore.getState().restore();
  await useStore.getState().startSample();
  const exiting = useStore.getState().exitSample();
  expect(useStore.getState().mode).not.toBe('sample');
  await exiting;
});

it('an IndexedDB that never answers falls back to storage off instead of a blank page', async () => {
  vi.useFakeTimers();
  try {
    vi.spyOn(Dexie.prototype, 'open').mockReturnValue(new Promise(() => {}) as never);
    const restoring = useStore.getState().restore();
    await vi.advanceTimersByTimeAsync(5_000);
    await restoring;
    expect(useStore.getState()).toMatchObject({ mode: 'empty', storage: 'off' });
  } finally {
    vi.useRealTimers();
  }
});

it('restore with a corrupt stored row starts normally, keeps valid rows and counts the skipped ones', async () => {
  await useStore.getState().restore();
  await useStore.getState().importFiles([file('run-00.json')]);
  const d = new Dexie('flakelens');
  await d.open();
  await d.table('imports').add({ importId: 'bad', seq: 99, result: 'nope' });
  d.close();
  useStore.setState(initial, true);
  await useStore.getState().restore();
  expect(useStore.getState()).toMatchObject({ mode: 'user', storage: 'ok', skippedRows: 1 });
  expect(useStore.getState().dataset.runs).toHaveLength(1);
  await useStore.getState().clearAll();
  expect(useStore.getState().skippedRows).toBe(0);
  expect((await loadDataset()).runs).toHaveLength(0);
  expect((await loadStored()).skipped).toBe(0); // the bad row is gone too
});

it('when every stored row is bad the app is empty (Start) with the skipped count', async () => {
  await useStore.getState().restore();
  const d = new Dexie('flakelens');
  await d.open();
  await d.table('imports').add({ importId: 'bad', seq: 0, result: 1 });
  d.close();
  useStore.setState(initial, true);
  await useStore.getState().restore();
  expect(useStore.getState()).toMatchObject({ mode: 'empty', storage: 'ok', skippedRows: 1 });
});

it('a drop of more than 200 files is refused: nothing changes and the drop zone gets the message', async () => {
  await useStore.getState().restore();
  await useStore.getState().importFiles([file('run-00.json')]);
  const before = useStore.getState().dataset;
  const many = Array.from({ length: 201 }, (_, i) => new File(['{}'], `f${i}.json`));
  await useStore.getState().importFiles(many);
  expect(useStore.getState().dataset).toBe(before);
  expect(useStore.getState().importError).toEqual({ code: 'import.fail.tooMany', limit: '200' });
  expect(useStore.getState().importing).toBeNull();
});
