import { create } from 'zustand';
import { emptyDataset, setCommitLabel } from '@/engine/dataset';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import type { Dataset, TestScore } from '@/engine/types';
import * as db from './db';
import { ImportRefused, ImportTimeout, runImport, type ImportSummary } from './importer';
import { clearPrefs } from '../lib/prefs';
import { loadSample } from './sample';

export type Mode = 'empty' | 'user' | 'sample';
export type Storage = 'ok' | 'off' | 'failed';
export interface ImportProgress {
  files: string[];
  done: number;
}
export type ImportError =
  | { code: 'import.fail.timeout'; file: string }
  | { code: 'import.fail.crash' }
  | { code: 'import.fail.tooMany' | 'import.fail.tooBig'; limit: string }; // the whole drop was refused
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
  skippedRows: number; // saved imports that could not be read on load (corrupt or from a newer app)
  lastImport: LastImport | null;
  importError: ImportError | null;
  dismissedBanners: ('skipped' | 'off')[]; // warnings the person closed; kept until the next page load
  labelFailed: string[]; // imports whose label is in memory only because storage refused it
  dismissBanner(kind: 'skipped' | 'off'): void;
  setCommitLabel(importId: string, label: string): Promise<'saved' | 'failed' | 'readonly'>;
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

const STORAGE_OPEN_MS = 3_000;
let controller: AbortController | null = null;
let inflight: Promise<void> | null = null; // the running import, so Clear all data can wait for it to stop

export const useStore = create<State>()((set, get) => ({
  ...empty(),
  importing: null,
  storage: 'ok',
  skippedRows: 0,
  dismissedBanners: [],
  labelFailed: [],
  lastImport: null,
  importError: null,

  dismissBanner(kind) {
    set((s) => ({ dismissedBanners: [...s.dismissedBanners, kind] }));
  },

  async setCommitLabel(importId, label) {
    const { mode, dataset, storage } = get();
    if (mode !== 'user') return 'readonly';
    // Memory first: Tests and the Evidence text recompute at once, whatever storage does next.
    set(withData('user', setCommitLabel(dataset, importId, label)));
    let saved = false;
    if (storage === 'ok') {
      try {
        await db.saveCommitLabel(importId, label);
        saved = true;
      } catch {
        /* reported below */
      }
    }
    set((s) => ({ labelFailed: saved ? s.labelFailed.filter((id) => id !== importId) : [...new Set([...s.labelFailed, importId])] }));
    return saved ? 'saved' : 'failed';
  },

  async restore() {
    // An open that never answers (another tab holds it, some private modes) must not leave a blank page.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const gaveUp = new Promise<false>((r) => (timer = setTimeout(() => r(false), STORAGE_OPEN_MS)));
    const available = await Promise.race([db.storageAvailable(), gaveUp]);
    clearTimeout(timer);
    if (!available) return set({ ...empty(), storage: 'off' });
    try {
      const { dataset: ds, skipped } = await db.loadStored();
      set({ ...withData(ds.runs.length > 0 ? 'user' : 'empty', ds), storage: 'ok', skippedRows: skipped });
    } catch {
      set({ ...empty(), storage: 'failed' });
    }
  },

  async importFiles(files, commitLabels) {
    if (get().importing || files.length === 0) return;
    const { mode, dataset, storage } = get();
    controller = new AbortController();
    let finished!: () => void;
    inflight = new Promise<void>((r) => (finished = r));
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
      else if (e instanceof ImportRefused) set({ importError: { code: e.code, limit: e.limit } });
      else if ((e as Error)?.name !== 'AbortError') set({ importError: { code: 'import.fail.crash' } });
    } finally {
      controller = null;
      set({ importing: null });
      finished();
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
    // Leave sample mode now, not after the stored data is read back: files added in between must not ask about the sample.
    set({ ...empty(), lastImport: null, importError: null });
    if (get().storage === 'ok') await get().restore();
    else set(empty());
  },

  async clearAll() {
    if (controller) {
      controller.abort(new DOMException('Data cleared', 'AbortError')); // a running import must not bring the data back
      await inflight;
    }
    let storage = get().storage;
    if (storage !== 'off') {
      try {
        await db.clearAll();
      } catch {
        storage = 'failed'; // memory is still cleared; the page says storage trouble
      }
    }
    clearPrefs(); // column choice and dismissed tips; theme, density and the shortcuts switch stay
    set({ ...empty(), storage, skippedRows: 0, lastImport: null, importError: null, labelFailed: [] });
  },
}));
