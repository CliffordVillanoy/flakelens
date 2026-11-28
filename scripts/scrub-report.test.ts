import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { parseReport } from '../src/engine/import/report';
import { cleanText, scrubReport } from './scrub-report';
import { verifyReport } from './verify-report';

const FAKE = 'FAKE-TOKEN-NOT-A-SECRET-000000';
type Json = Parameters<typeof scrubReport>[0];
const dirty = (): Json => JSON.parse(readFileSync('fixtures/ci-report/dirty.json', 'utf8')) as Json;
const scrubbed = () => scrubReport(dirty());
const asText = (v: Json) => JSON.stringify(v);

it('the dirty fixture is rejected by the verifier for every kind of problem the scrub is there to remove', () => {
  const kinds = new Set(verifyReport(dirty(), 10_000).map((p) => p.kind));
  for (const k of ['unknown-top-level-key', 'forbidden-key', 'email', 'absolute-path', 'secret-like']) expect(kinds.has(k as never), k).toBe(true);
});

it('after the scrub the verifier finds nothing, and nothing private is left in the text', () => {
  const out = scrubbed();
  expect(verifyReport(out, asText(out).length)).toEqual([]);
  const text = asText(out);
  for (const gone of ['ada@example.com', 'Ada Example', 'noreply@github.com', 'private body', 'Signed-off-by', FAKE, '/home/runner', 'C:\\\\Users', '/Users/', '/opt/hostedtoolcache', 'gitDiff', 'secret.ts', 'GITHUB_TOKEN', 'trace.zip', 'userAgent', 'futureField', 'newPlaywrightField', 'newStat', 'actualWorkers', 'workerIndex', 'stdout', 'attachments', 'annotations', 'argv', 'outputDir', 'testDir', 'snapshotDir', 'Global error for ada'])
    expect(text, gone).not.toContain(gone);
});

it('it is an allowlist: only the named top-level keys survive, and any field it has never seen is dropped', () => {
  const out = scrubbed() as { [k: string]: Json };
  expect(Object.keys(out)).toEqual(['config', 'suites', 'errors', 'stats']);
  expect(Object.keys(out.config as object).sort()).toEqual(['filteredProjects', 'metadata', 'projects', 'shard', 'version']);
  expect(Object.keys((out.stats as object) ?? {}).sort()).toEqual(['duration', 'expected', 'flaky', 'skipped', 'startTime', 'unexpected']);
  const unknown = scrubReport({ config: { brandNewField: 1, metadata: { gitCommit: { hash: 'abcdef1', future: 'x' }, other: 1 } }, suites: [{ title: 't', newThing: 1, specs: [{ title: 's', extra: 1, tests: [{ status: 'expected', surprise: 1, results: [{ status: 'passed', secret: 'x' }] }] }] }], zzz: 1 });
  expect(asText(unknown)).not.toMatch(/brandNewField|future|other|newThing|extra|surprise|secret|zzz/);
});

it('it keeps what FlakeLens reads: commit, branch, browser, shard, OS, run time, the tests and their attempts', () => {
  const out = scrubbed() as { config: { shard: Json; metadata: { os: string; gitCommit: Record<string, string> }; filteredProjects: { use: { defaultBrowserType: string } }[] }; suites: Json[]; stats: Record<string, Json> };
  expect(out.config.metadata.gitCommit).toMatchObject({ hash: '4e06c9792d11fc394fff10e801e917d37d5537ca', shortHash: '4e06c97', branch: 'feature/ada-FAKE-branch' });
  expect(out.config.metadata.gitCommit.subject).toBe('Merge pull request from [email] token=[redacted]');
  expect(out.config).toMatchObject({ shard: { current: 2, total: 4 }, version: '1.65.1' });
  expect(out.config.metadata.os).toBe('Linux');
  expect(out.config.filteredProjects[0]!.use.defaultBrowserType).toBe('chromium');
  expect(out.stats).toMatchObject({ startTime: '2026-11-28T12:00:00.000Z', flaky: 1 });
  const text = asText(out as Json);
  expect(text).toContain('"id":"866d5cea7c69e902a1e2-7b656fe726a89d6c0442"'); // a test id is a hash, not text: not masked
  expect(text).toContain('"status":"flaky"');
  expect(text).toContain('e2e/import.spec.ts:9:5'); // the repo root is removed, the file stays readable
  expect(text).toContain('imports a file from fixtures/a.json for [email]'.replace('fixtures', 'e2e/fixtures'));
});

it('the scrubbed report still imports into FlakeLens and shows the commit', () => {
  const r = parseReport(asText(scrubbed()), { fileName: 'report.json', importedAt: '2026-11-28T00:00:00.000Z', order: 0 });
  expect(r.record.result).not.toBe('failed');
  expect(r.record.notices.map((n) => n.code)).not.toContain('import.noCommit');
  expect(r.runs[0]).toMatchObject({ commit: '4e06c9792d11fc394fff10e801e917d37d5537ca', branch: 'feature/ada-FAKE-branch', browser: 'chromium', shard: { current: 2, total: 4 }, os: 'Linux', startedAt: '2026-11-28T12:00:00.000Z' });
  expect(r.attempts.map((a) => a.status)).toEqual(['fail', 'pass']);
  expect(r.failures[0]!.message).toContain('Error: expected 1, got 0');
  expect(JSON.stringify(r)).not.toContain(FAKE);
});

it('the scrub is idempotent and handles reports of any shape without throwing', () => {
  const once = scrubbed();
  expect(scrubReport(once)).toEqual(once);
  expect(scrubReport({})).toEqual({ config: {}, suites: [], errors: [], stats: {} });
  for (const odd of [null, 1, 'x', [], [1, 2], { config: 5, suites: 'x', stats: [], errors: {} }, { suites: [null, 1, 'a', { specs: 'x' }] }] as Json[]) expect(() => scrubReport(odd)).not.toThrow();
});

it('cleanText: repo-relative paths, no other absolute path, no email, no secret; ordinary text and URLs are left alone', () => {
  expect(cleanText('at /repo/e2e/a.spec.ts:3:1', '/repo')).toBe('at e2e/a.spec.ts:3:1');
  expect(cleanText('at D:\\code\\repo\\e2e\\a.spec.ts:3:1', 'D:/code/repo')).toBe('at e2e\\a.spec.ts:3:1');
  expect(cleanText('see /home/bob/x.ts and /Users/bob/y.ts and C:\\Users\\bob\\z.ts')).toBe('see [path] and [path] and [path]');
  expect(cleanText('mail me: bob@example.com, noreply@github.com')).toBe('mail me: [email], [email]');
  expect(cleanText(`Authorization: Bearer ${FAKE}`)).not.toContain(FAKE);
  expect(cleanText('https://example.com/home/page?x=1 and www.example.com/Users/list')).toBe('https://example.com/home/page?x=1 and www.example.com/Users/list');
  expect(cleanText('Timeout 30000ms exceeded while waiting for locator("#pay")')).toBe('Timeout 30000ms exceeded while waiting for locator("#pay")');
  expect(cleanText('ci/dev-50-scrub-allowlist', '', false)).toBe('ci/dev-50-scrub-allowlist');
  expect(cleanText('x'.repeat(60_000)).length).toBeLessThanOrEqual(50_000);
});

it('timing: hostile text and a big report are cleaned in well under a second or two', () => {
  const hostile: [string, string][] = [
    ['5 MB of at signs', '@'.repeat(5_000_000)],
    ['dots and letters', 'a.'.repeat(2_500_000)],
    ['repeated drive prefixes', 'C:\\'.repeat(1_000_000)],
    ['repeated home prefixes', '/home/'.repeat(1_000_000)],
    ['a long address-like run', 'x'.repeat(200) + '@' + 'y.'.repeat(2_000_000)],
    ['no separators', 'q'.repeat(5_000_000)],
  ];
  for (const [name, text] of hostile) {
    const t0 = performance.now();
    cleanText(text, '/repo');
    expect(performance.now() - t0, name).toBeLessThan(1000);
  }
  const specs = Array.from({ length: 20_000 }, (_, i) => ({ title: `test ${i} for a@b.co`, file: 'a.spec.ts', tests: [{ status: 'expected', results: [{ status: 'passed', duration: 1, retry: 0, errors: [{ message: 'at /home/x/y' }] }] }] }));
  const t1 = performance.now();
  scrubReport({ config: { rootDir: '/repo/e2e' }, suites: [{ title: 's', specs }] } as Json);
  expect(performance.now() - t1).toBeLessThan(3000);
});

it('suites nested far beyond any real report are cut, not recursed into', () => {
  let nested: Json = { title: 'leaf' };
  for (let i = 0; i < 10_000; i++) nested = { title: 'n', suites: [nested] };
  expect(() => scrubReport({ config: {}, suites: [nested] } as Json)).not.toThrow();
});

// ---- the two scripts as CI runs them: node scripts/<name>.ts <file> ----
const node = (script: string, file: string) => spawnSync(process.execPath, [script, file], { encoding: 'utf8' });

it('as a command: scrub then verify exits 0; verify on the dirty file exits 1 and never prints a value; a missing file is fine', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'scrub-'));
  const file = path.join(dir, 'report.json');
  copyFileSync('fixtures/ci-report/dirty.json', file);
  const before = node('scripts/verify-report.ts', file);
  expect(before.status).toBe(1);
  expect(before.stderr).toMatch(/forbidden-key at config\.metadata\.gitCommit\.author/);
  for (const secret of ['ada@example.com', 'Ada Example', FAKE, '/home/runner']) expect(before.stderr).not.toContain(secret);
  expect(node('scripts/scrub-report.ts', file).status).toBe(0);
  const after = node('scripts/verify-report.ts', file);
  expect(after.status).toBe(0);
  expect(after.stdout).toContain('clean');
  const missing = path.join(dir, 'none.json');
  expect(node('scripts/scrub-report.ts', missing).status).toBe(0);
  expect(node('scripts/verify-report.ts', missing).status).toBe(0);
  writeFileSync(file, '{ not json');
  expect(node('scripts/verify-report.ts', file).status).toBe(1);
  expect(node('scripts/scrub-report.ts', file).status).not.toBe(0); // a bad file fails the step
});
