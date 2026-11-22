import { addImport } from '@/engine/dataset';
import { failedImport } from '@/engine/import/failed';
import { scoreTests } from '@/engine/score/score';
import type { Dataset, ImportRecord, ImportResult } from '@/engine/types';
import { saveImport, uniqueImportId } from './db';
import { MAX_FILE_BYTES, MAX_FILES, MAX_TOTAL_BYTES } from './limits';
import { workerParser } from './parser';
import type { ParseInput } from './worker';

export interface Parser {
  parseFiles(files: ParseInput[], importedAt: string, onProgress: (i: number) => void): Promise<ImportResult[]>;
  terminate(): void;
}

export interface ImportSummary {
  records: ImportRecord[];
  newFlaky: number;
}

export class ImportTimeout extends Error {
  constructor(readonly file: string) {
    super(`${file} timed out`);
    this.name = 'ImportTimeout';
  }
}

/** The whole drop is refused (too many files, too much together) before anything is read. Nothing changes. */
export class ImportRefused extends Error {
  constructor(
    readonly code: 'import.fail.tooMany' | 'import.fail.tooBig',
    readonly limit: string,
  ) {
    super(code);
    this.name = 'ImportRefused';
  }
}

export interface ImportOptions {
  dataset: Dataset;
  persist: boolean;
  signal: AbortSignal;
  commitLabels?: Record<string, string>;
  onProgress?: (done: number, total: number) => void;
  parser?: () => Parser;
  timeoutMs?: number; // per file
}

const FILE_TIMEOUT_MS = 30_000;
const mb = (bytes: number) => `${Math.round(bytes / 1_000_000)} MB`;

const flakyIds = (ds: Dataset) => new Set(scoreTests(ds).filter((s) => s.label === 'flaky').map((s) => s.testId));

/**
 * Reads and parses files in a worker, then adds them to `dataset` in order. Nothing is applied or saved until
 * every file is parsed, so a cancel or timeout leaves the caller's data exactly as it was.
 */
export async function runImport(
  files: File[],
  opts: ImportOptions,
): Promise<ImportSummary & { dataset: Dataset; storageFailed: boolean }> {
  const { signal, timeoutMs = FILE_TIMEOUT_MS } = opts;
  signal.throwIfAborted();
  // Sizes first, from File.size: a huge drop is refused before a single byte is read.
  if (files.length > MAX_FILES) throw new ImportRefused('import.fail.tooMany', String(MAX_FILES));
  if (files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES) throw new ImportRefused('import.fail.tooBig', mb(MAX_TOTAL_BYTES));
  const importedAt = new Date().toISOString();
  // One file at a time keeps memory bounded; a cancel stops before the next read. A file over the limit is
  // failed in place without being read.
  const inputs: ParseInput[] = [];
  const refused = new Map<number, ImportResult>();
  for (const [i, f] of files.entries()) {
    signal.throwIfAborted();
    if (f.size > MAX_FILE_BYTES) {
      refused.set(i, failedImport({ fileName: f.name, importedAt }, 'import.fail.tooLarge', { limit: mb(MAX_FILE_BYTES) }));
      continue;
    }
    inputs.push({ name: f.name, text: await f.text(), commitLabel: opts.commitLabels?.[f.name] });
  }
  signal.throwIfAborted();

  const parser = (opts.parser ?? workerParser)();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let fromWorker: ImportResult[];
  try {
    fromWorker = await new Promise<ImportResult[]>((resolve, reject) => {
      const fail = (e: unknown) => {
        parser.terminate();
        reject(e);
      };
      let current = 0;
      const arm = () => {
        clearTimeout(timer);
        const file = inputs[current]?.name ?? '';
        timer = setTimeout(() => fail(new ImportTimeout(file)), timeoutMs);
      };
      signal.addEventListener('abort', () => fail(signal.reason), { once: true });
      arm();
      parser
        .parseFiles(inputs, importedAt, (done) => {
          current = done;
          arm(); // the limit is per file
          opts.onProgress?.(done, inputs.length);
        })
        .then(resolve, fail);
    });
  } finally {
    clearTimeout(timer);
  }
  parser.terminate();
  // Back in drop order: parsed results fill the gaps the refused files left.
  const next = fromWorker[Symbol.iterator]();
  const results = files.map((_, i) => refused.get(i) ?? next.next().value!);
  signal.throwIfAborted(); // a cancel or Clear all data that landed after parsing still wins

  let dataset = opts.dataset;
  let order = Math.max(-1, ...dataset.runs.map((r) => r.order)) + 1;
  const records: ImportRecord[] = [];
  const toSave: ImportResult[] = [];
  for (const parsed of results) {
    const ids = new Set(dataset.imports.map((i) => i.importId));
    const res = uniqueImportId(parsed, (id) => ids.has(id));
    const ordered = { ...res, runs: res.runs.map((r) => ({ ...r, order: order++ })) };
    dataset = addImport(dataset, ordered);
    records.push(dataset.imports.at(-1)!);
    toSave.push(ordered);
  }

  let storageFailed = false;
  // A drop where every file failed changes nothing, in memory or in storage.
  if (opts.persist && toSave.some((r) => r.record.result !== 'failed')) {
    try {
      for (const res of toSave) {
        signal.throwIfAborted();
        await saveImport(res);
      }
    } catch {
      storageFailed = true; // data stays in memory for this session
    }
  }

  const before = flakyIds(opts.dataset);
  const newFlaky = opts.dataset.runs.length === 0 ? 0 : [...flakyIds(dataset)].filter((id) => !before.has(id)).length;
  return { dataset, records, newFlaky, storageFailed };
}
