import { create } from 'zustand';
import { emptyDataset } from '@/engine/dataset';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import type { Dataset, TestScore } from '@/engine/types';
import * as db from './db';
import { ImportTimeout, runImport, type ImportSummary } from './importer';
import { clearPrefs } from '../lib/prefs';
import { loadSample } from './sample';

export type Mode = 'empty' | 'user' | 'sample';
export type Storage = 'ok' | 'off' | 'failed';
export interface ImportProgress {
  files: string[];
  done: number;
}
export type ImportError = { code: 'import.fail.timeout'; file: string } | { code: 'import.fail.crash' };
export interface LastImport extends ImportSummary {
  newRuns: number;
  wasEmpty: boolean; // nothing was loaded before this import: "Imported", not "Added"
}

interface State {
  mode: Mode;
  dataset: Dataset;
  ranked: TestScore[];
  importing: ImportProgress | null;
  storage: Storage;
  lastImport: LastImport | null;
  importError: ImportError | null;
  restore(): Promise<void>;
  importFiles(files: File[], commitLabels?: Record<string, string>): Promise<void>;
  cancelImport(): void;
  dismissImport(): void;
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
      set({ ...withData(ds.runs.length > 0 ? 'user' : 'empty', ds), storage: 'ok' });
    } catch {
      set({ ...empty(), storage: 'failed' });
    }
  },

  async importFiles(files, commitLabels) {
    if (get().importing || files.length === 0) return;
    const { mode, dataset, storage } = get();
    controller = new AbortController();
    const base = mode === 'sample' ? emptyDataset() : dataset; // sample data is never mixed with the user's runs
    set({ importing: { files: files.map((f) => f.name), done: 0 }, importError: null, lastImport: null });
    try {
      const r = await runImport(files, {
        dataset: base,
        persist: storage === 'ok',
        signal: controller.signal,
        commitLabels,
        onProgress: (done) => set((s) => ({ importing: s.importing && { ...s.importing, done } })),
      });
      const imported = r.records.some((rec) => rec.result !== 'failed');
      set({
        // A drop where every file failed changes nothing: the user stays where they were.
        ...(imported ? withData('user', r.dataset) : {}),
        lastImport: {
          records: r.records,
          newFlaky: r.newFlaky,
          newRuns: r.dataset.runs.length - base.runs.length,
          wasEmpty: base.runs.length === 0,
        },
        ...(r.storageFailed ? { storage: 'failed' as const } : {}),
      });
    } catch (e) {
      if (e instanceof ImportTimeout) set({ importError: { code: 'import.fail.timeout', file: e.file } });
      else if ((e as Error)?.name !== 'AbortError') set({ importError: { code: 'import.fail.crash' } });
    } finally {
      controller = null;
      set({ importing: null });
    }
  },

  cancelImport() {
    controller?.abort(new DOMException('Import cancelled', 'AbortError'));
  },

  dismissImport() {
    set({ lastImport: null, importError: null });
  },

  async startSample() {
    set({ ...withData('sample', await loadSample()), lastImport: null, importError: null });
  },

  async exitSample() {
    set({ lastImport: null, importError: null });
    if (get().storage === 'ok') await get().restore();
    else set(empty());
  },

  async clearAll() {
    let storage = get().storage;
    if (storage !== 'off') {
      try {
        await db.clearAll();
      } catch {
        storage = 'failed'; // memory is still cleared; the page says storage trouble
      }
    }
    clearPrefs(); // column choice and dismissed tips; theme, density and the shortcuts switch stay
    set({ ...empty(), storage, lastImport: null, importError: null });
  },
}));
