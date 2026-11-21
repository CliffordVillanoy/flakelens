import { proxy, wrap } from 'comlink';
import type { Parser } from './importer';
import type { parseFiles } from './worker';

// A fresh worker per import, so cancel and timeout can simply terminate it.
export function workerParser(): Parser {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const api = wrap<{ parseFiles: typeof parseFiles }>(worker);
  return {
    parseFiles: (files, importedAt, onProgress) => api.parseFiles(files, importedAt, proxy(onProgress)),
    terminate: () => worker.terminate(),
  };
}
