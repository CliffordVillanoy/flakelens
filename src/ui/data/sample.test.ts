import { it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadSample } from './sample';

afterEach(() => vi.unstubAllGlobals());

it('loads every sample file relative to the page, with the manifest commits', async () => {
  const urls: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    urls.push(url);
    return new Response(readFileSync(`public/${url}`, 'utf8'));
  });
  const ds = await loadSample();
  const manifest: { file: string; commit: string }[] = JSON.parse(readFileSync('public/sample/manifest.json', 'utf8'));
  expect(urls[0]).toBe('sample/manifest.json'); // relative, so it works under /flakelens/
  expect(urls.every((u) => !u.startsWith('/'))).toBe(true);
  expect(ds.imports).toHaveLength(manifest.length);
  expect(ds.runs).toHaveLength(manifest.length);
  expect(new Set(ds.runs.map((r) => r.commit))).toEqual(new Set(manifest.map((m) => m.commit)));
  expect(ds.imports.some((i) => i.counts.notImported > 0)).toBe(true);
});

it('rejects a manifest entry that is not a plain file name', async () => {
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify([{ file: '../secret.json', commit: 'c0' }])));
  await expect(loadSample()).rejects.toThrow(/manifest/);
});
