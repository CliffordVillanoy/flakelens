import { expose } from 'comlink';
import { parsePlaywrightReport } from '@/engine/import/playwright';
import type { ImportResult } from '@/engine/types';

export interface ParseInput {
  name: string;
  text: string;
  commitLabel?: string;
}

/** Parses files in order and reports progress after each one. `order` is set by the importer afterwards. */
export function parseFiles(files: ParseInput[], importedAt: string, onProgress: (i: number) => void): ImportResult[] {
  return files.map((f, i) => {
    const res = parsePlaywrightReport(f.text, { fileName: f.name, importedAt, order: i, commitLabel: f.commitLabel });
    onProgress(i + 1);
    return res;
  });
}

declare const WorkerGlobalScope: { new (): unknown } | undefined;
// Only expose when running as a worker; tests and the main thread import parseFiles directly.
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) expose({ parseFiles });
