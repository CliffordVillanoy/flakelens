import { expose } from 'comlink';
import { z } from 'zod';
import { parseReport } from '@/engine/import/report';
import type { ImportResult } from '@/engine/types';

// The page CSP does not cover workers; this keeps zod from compiling parsers with Function() so none is needed.
z.config({ jitless: true });

export interface ParseInput {
  name: string;
  text: string;
  commitLabel?: string;
}

/** Parses files in order and reports progress after each one. `order` is set by the importer afterwards. */
export function parseFiles(files: ParseInput[], importedAt: string, onProgress: (i: number) => void): ImportResult[] {
  return files.map((f, i) => {
    const res = parseReport(f.text, { fileName: f.name, importedAt, order: i, commitLabel: f.commitLabel });
    onProgress(i + 1);
    return res;
  });
}

declare const WorkerGlobalScope: { new (): unknown } | undefined;
// Only expose when running as a worker; tests and the main thread import parseFiles directly.
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) expose({ parseFiles });
