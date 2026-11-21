import { addImport, emptyDataset } from '@/engine/dataset';
import type { Dataset } from '@/engine/types';
import type { Parser } from './importer';
import { workerParser } from './parser';

// Built-in demo runs from public/sample (DEV-05). Held in memory only; never stored, never mixed with user data.
// URLs are relative to the page, so this works under any base path (GitHub Pages serves /flakelens/).
// Parsing happens in the worker, like the user's own files, so the report parser (and its schema library)
// stays out of the main bundle.
export async function loadSample(makeParser: () => Parser = workerParser): Promise<Dataset> {
  const res = await fetch('sample/manifest.json');
  if (!res.ok) throw new Error(`sample manifest: HTTP ${res.status}`);
  const manifest: unknown = await res.json();
  if (
    !Array.isArray(manifest) ||
    !manifest.every((m) => typeof m?.file === 'string' && /^[\w.-]+\.json$/.test(m.file) && typeof m?.commit === 'string')
  )
    throw new Error('sample manifest: unexpected shape');
  const entries = manifest as { file: string; commit: string }[];
  const inputs = await Promise.all(
    entries.map(async ({ file, commit }) => {
      const r = await fetch(`sample/${file}`);
      if (!r.ok) throw new Error(`sample ${file}: HTTP ${r.status}`);
      return { name: file, text: await r.text(), commitLabel: commit };
    }),
  );
  const parser = makeParser();
  try {
    const results = await parser.parseFiles(inputs, new Date().toISOString(), () => {});
    return results.reduce((ds, result) => addImport(ds, result), emptyDataset());
  } finally {
    parser.terminate();
  }
}
