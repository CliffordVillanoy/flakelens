import { addImport } from '@/engine/dataset';
import { scoreTests } from '@/engine/score/score';
import type { Dataset, ImportRecord, ImportResult } from '@/engine/types';
import { saveImport, uniqueImportId } from './db';
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
  constructor() {
    super('import timed out');
    this.name = 'ImportTimeout';
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
  const inputs: ParseInput[] = await Promise.all(
    files.map(async (f) => ({ name: f.name, text: await f.text(), commitLabel: opts.commitLabels?.[f.name] })),
  );
  signal.throwIfAborted();

  const parser = (opts.parser ?? workerParser)();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let results: ImportResult[];
  try {
    results = await new Promise<ImportResult[]>((resolve, reject) => {
      const fail = (e: unknown) => {
        parser.terminate();
        reject(e);
      };
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => fail(new ImportTimeout()), timeoutMs);
      };
      signal.addEventListener('abort', () => fail(signal.reason), { once: true });
      arm();
      parser
        .parseFiles(inputs, new Date().toISOString(), (done) => {
          arm(); // the limit is per file
          opts.onProgress?.(done, inputs.length);
        })
        .then(resolve, fail);
    });
  } finally {
    clearTimeout(timer);
  }
  parser.terminate();

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
  if (opts.persist) {
    try {
      for (const res of toSave) await saveImport(res);
    } catch {
      storageFailed = true; // data stays in memory for this session
    }
  }

  const before = flakyIds(opts.dataset);
  const newFlaky = opts.dataset.runs.length === 0 ? 0 : [...flakyIds(dataset)].filter((id) => !before.has(id)).length;
  return { dataset, records, newFlaky, storageFailed };
}
