import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parsePlaywrightReport } from './playwright';

// DEV-39: real Playwright 1.65 reports recorded from the flake lab (flake-lab/capture-real.mjs).
const real = (f: string) => readFileSync(`fixtures/playwright/real/${f}.json`, 'utf8');
const opts = { fileName: 'run.json', importedAt: '2026-11-20T12:00:00.000Z', order: 0 };
const codes = (r: ReturnType<typeof parsePlaywrightReport>) => r.record.notices.map((n) => n.code);

it('a real report with git info: commit, branch and browser are read; no shard, no OS; no noCommit notice', () => {
  const r = parsePlaywrightReport(real('git-two-projects'), opts);
  const run = r.runs[0]!;
  expect(run.commit).toMatch(/^[0-9a-f]{40}$/);
  expect(run.branch).toBe('feat/dev-39-run-metadata');
  expect(run.browser).toBe('chromium');
  expect(run.shard).toBeNull();
  expect(run.os).toBeNull();
  expect(codes(r)).not.toContain('import.noCommit');
  expect(run.reportCommit).toBeUndefined();
});

it('a real report without git info: everything stays null and the noCommit notice stays', () => {
  const run = parsePlaywrightReport(real('no-git'), opts).runs[0]!;
  expect(run).toMatchObject({ commit: null, branch: null, shard: null, os: null, browser: 'chromium' });
  expect(codes(parsePlaywrightReport(real('no-git'), opts))).toContain('import.noCommit');
});

it('real shard reports carry the shard', () => {
  expect(parsePlaywrightReport(real('shard-1-of-2'), opts).runs[0]!.shard).toEqual({ current: 1, total: 2 });
  expect(parsePlaywrightReport(real('shard-2-of-2'), opts).runs[0]!.shard).toEqual({ current: 2, total: 2 });
});

it('a typed label wins over the commit in the report, and the report commit is kept for when the label is removed', () => {
  const r = parsePlaywrightReport(real('git-two-projects'), { ...opts, commitLabel: ' v1.2 ' });
  const hash = parsePlaywrightReport(real('git-two-projects'), opts).runs[0]!.commit;
  expect(r.runs[0]!.commit).toBe('v1.2');
  expect(r.runs[0]!.reportCommit).toBe(hash);
  expect(codes(r)).not.toContain('import.noCommit');
});

it('hostile metadata in a report becomes cleaned text or null, never an error', () => {
  const report = JSON.parse(real('git-two-projects'));
  report.config.metadata.gitCommit = { hash: '<script>', branch: 'x'.repeat(10_000) + '\n', author: 5 };
  report.config.shard = { current: -1, total: 2 };
  report.config.metadata.os = '<img src=x onerror=alert(1)>\u0007';
  const r = parsePlaywrightReport(JSON.stringify(report), opts);
  expect(r.record.result).not.toBe('failed');
  const run = r.runs[0]!;
  expect(run.commit).toBeNull();
  expect(run.branch).toHaveLength(200);
  expect(run.shard).toBeNull();
  expect(run.os).toBe('<img src=x onerror=alert(1)>');
  expect(codes(r)).toContain('import.noCommit');
});

it('the old fixtures (no metadata) still import with null metadata and the same counts', () => {
  const r = parsePlaywrightReport(readFileSync('fixtures/playwright/valid-basic.json', 'utf8'), opts);
  expect(r.runs[0]).toMatchObject({ branch: null, browser: null, shard: null, os: null });
  expect(r.record.counts).toEqual({ found: 4, imported: 4, notImported: 0 });
});
