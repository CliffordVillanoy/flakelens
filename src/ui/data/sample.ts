import { addImport, emptyDataset } from '@/engine/dataset';
import { parsePlaywrightReport } from '@/engine/import/playwright';
import type { Dataset } from '@/engine/types';

// Built-in demo runs from public/sample (DEV-05). Held in memory only; never stored, never mixed with user data.
// URLs are relative to the page, so this works under any base path (GitHub Pages serves /flakelens/).
export async function loadSample(): Promise<Dataset> {
  const res = await fetch('sample/manifest.json');
  if (!res.ok) throw new Error(`sample manifest: HTTP ${res.status}`);
  const manifest: unknown = await res.json();
  if (
    !Array.isArray(manifest) ||
    !manifest.every((m) => typeof m?.file === 'string' && /^[\w.-]+\.json$/.test(m.file) && typeof m?.commit === 'string')
  )
    throw new Error('sample manifest: unexpected shape');
  const entries = manifest as { file: string; commit: string }[];
  const texts = await Promise.all(
    entries.map(async ({ file }) => {
      const r = await fetch(`sample/${file}`);
      if (!r.ok) throw new Error(`sample ${file}: HTTP ${r.status}`);
      return r.text();
    }),
  );
  const importedAt = new Date().toISOString();
  return entries.reduce(
    (ds, { file, commit }, order) =>
      addImport(ds, parsePlaywrightReport(texts[order]!, { fileName: file, importedAt, order, commitLabel: commit })),
    emptyDataset(),
  );
}
