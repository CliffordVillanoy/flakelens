import { create } from 'zustand';
import { emptyDataset } from '@/engine/dataset';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import type { Dataset, TestScore } from '@/engine/types';
import * as db from './db';
import { runImport, type ImportSummary } from './importer';
import { loadSample } from './sample';

export type Mode = 'empty' | 'user' | 'sample';
export type Storage = 'ok' | 'off' | 'failed';
export interface ImportProgress {
  total: number;
  done: number;
}

interface State {
  mode: Mode;
  dataset: Dataset;
  ranked: TestScore[];
  importing: ImportProgress | null;
  storage: Storage;
  lastImport: ImportSummary | null;
  importError: 'timeout' | 'failed' | null;
  restore(): Promise<void>;
  importFiles(files: File[], commitLabels?: Record<string, string>): Promise<void>;
  cancelImport(): void;
  startSample(): Promise<void>;
  exitSample(): Promise<void>;
  clearAll(): Promise<void>;
}

const rank = (ds: Dataset) => rankTests(scoreTests(ds), ds.tests);
const withData = (mode: Mode, dataset: Dataset) => ({ mode, dataset, ranked: rank(dataset) });
const empty = () => withData('empty', emptyDataset());

let controller: AbortController | null = null;

export const useStore = create<State>()((set, get) => ({
  ...empty(),
  importing: null,
  storage: 'ok',
  lastImport: null,
  importError: null,

  async restore() {
    if (!(await db.storageAvailable())) return set({ ...empty(), storage: 'off' });
    try {
      const ds = await db.loadDataset();
      set({ ...withData(ds.imports.length > 0 ? 'user' : 'empty', ds), storage: 'ok' });
    } catch {
      set({ ...empty(), storage: 'failed' });
    }
  },

  async importFiles(files, commitLabels) {
    if (get().importing || files.length === 0) return;
    const { mode, dataset, storage } = get();
    controller = new AbortController();
    set({ importing: { total: files.length, done: 0 }, importError: null });
    try {
      const r = await runImport(files, {
        // Sample data is never mixed with the user's runs.
        dataset: mode === 'sample' ? emptyDataset() : dataset,
        persist: storage === 'ok',
        signal: controller.signal,
        commitLabels,
        onProgress: (done, total) => set({ importing: { done, total } }),
      });
      set({
        ...withData(r.dataset.imports.length > 0 ? 'user' : 'empty', r.dataset),
        lastImport: { records: r.records, newFlaky: r.newFlaky },
        ...(r.storageFailed ? { storage: 'failed' as const } : {}),
      });
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') set({ importError: (e as Error)?.name === 'ImportTimeout' ? 'timeout' : 'failed' });
    } finally {
      controller = null;
      set({ importing: null });
    }
  },

  cancelImport() {
    controller?.abort(new DOMException('Import cancelled', 'AbortError'));
  },

  async startSample() {
    set(withData('sample', await loadSample()));
  },

  async exitSample() {
    if (get().storage === 'ok') await get().restore();
    else set(empty());
  },

  async clearAll() {
    if (get().storage !== 'off') await db.clearAll();
    set({ ...empty(), lastImport: null });
  },
}));
