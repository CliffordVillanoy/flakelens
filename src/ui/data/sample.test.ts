import { it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadSample } from './sample';
import type { Parser } from './importer';
import { parseFiles } from './worker';

const direct = (terminate = () => {}): (() => Parser) => () => ({ parseFiles: async (f, at, cb) => parseFiles(f, at, cb), terminate });

afterEach(() => vi.unstubAllGlobals());

it('loads every sample file relative to the page, with the manifest commits', async () => {
  const urls: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    urls.push(url);
    return new Response(readFileSync(`public/${url}`, 'utf8'));
  });
  const ds = await loadSample(direct());
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
  await expect(loadSample(direct())).rejects.toThrow(/manifest/);
});

it('parses in the given parser (the worker), with the manifest commits, and ends it afterwards', async () => {
  vi.stubGlobal('fetch', async (url: string) => new Response(readFileSync(`public/${url}`, 'utf8')));
  const calls: { names: string[]; commits: (string | undefined)[] }[] = [];
  const terminate = vi.fn();
  const parser = (): Parser => ({
    parseFiles: async (files, at, cb) => {
      calls.push({ names: files.map((f) => f.name), commits: files.map((f) => f.commitLabel) });
      return parseFiles(files, at, cb);
    },
    terminate,
  });
  const ds = await loadSample(parser);
  expect(calls).toHaveLength(1); // one worker call for all files
  expect(calls[0]!.names[0]).toBe('run-00.json');
  expect(calls[0]!.commits.slice(0, 3)).toEqual(['c0', 'c0', 'c1']);
  expect(terminate).toHaveBeenCalledTimes(1);
  expect(ds.runs.map((r) => r.order)).toEqual(ds.runs.map((_, i) => i));
});

it('ends the parser even when parsing fails', async () => {
  vi.stubGlobal('fetch', async (url: string) => new Response(readFileSync(`public/${url}`, 'utf8')));
  const terminate = vi.fn();
  const parser = (): Parser => ({ parseFiles: async () => Promise.reject(new Error('worker died')), terminate });
  await expect(loadSample(parser)).rejects.toThrow('worker died');
  expect(terminate).toHaveBeenCalledTimes(1);
});
