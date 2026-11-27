import { it, expect } from 'vitest';
import fc from 'fast-check';
import { META_MAX, cleanMeta, readRunMetadata } from './metadata';

// DEV-39: run metadata is read from the report's config. Every value is untrusted text: cleaned, capped, or null.
const gitCommit = (over: Record<string, unknown> = {}) => ({ hash: 'a'.repeat(40), shortHash: 'aaaaaaa', branch: 'main', ...over });
const config = (over: Record<string, unknown> = {}) => ({ metadata: { gitCommit: gitCommit() }, ...over });

it('commit: the full hash from config.metadata.gitCommit.hash', () => {
  expect(readRunMetadata(config()).commit).toBe('a'.repeat(40));
  expect(readRunMetadata(config({ metadata: { gitCommit: gitCommit({ hash: ' ABCDEF1234 ' }) } })).commit).toBe('ABCDEF1234');
});

it('commit: only a hex hash counts; anything else is null, never text', () => {
  for (const hash of ['<script>alert(1)</script>', 'not a hash', 'abc', 'g'.repeat(40), 'a'.repeat(10_000), 12345, null, {}, []]) {
    expect(readRunMetadata(config({ metadata: { gitCommit: gitCommit({ hash }) } })).commit).toBeNull();
  }
});

it('branch: config.metadata.gitCommit.branch, trimmed', () => {
  expect(readRunMetadata(config({ metadata: { gitCommit: gitCommit({ branch: '  feat/x  ' }) } })).branch).toBe('feat/x');
});

it('branch: control characters are cleaned, the length is capped, markup stays inert text', () => {
  const m = (branch: unknown) => readRunMetadata(config({ metadata: { gitCommit: gitCommit({ branch }) } })).branch;
  expect(m('a\nb\tc\u0000d')).toBe('abcd');
  expect(m('x'.repeat(10_000))).toHaveLength(META_MAX);
  expect(m('<script>alert(1)</script>')).toBe('<script>alert(1)</script>');
  expect(m('   ')).toBeNull();
  expect(m(7)).toBeNull();
  expect(m(null)).toBeNull();
});

it('browser: the distinct defaultBrowserType of the projects in the report, joined', () => {
  const p = (t: unknown) => ({ name: 'p', use: { defaultBrowserType: t } });
  expect(readRunMetadata(config({ filteredProjects: [p('chromium'), p('chromium')] })).browser).toBe('chromium');
  expect(readRunMetadata(config({ filteredProjects: [p('chromium'), p('webkit'), p('firefox')] })).browser).toBe('chromium, webkit, firefox');
  expect(readRunMetadata(config({ filteredProjects: [{ name: 'p' }, p(5), p('')] })).browser).toBeNull();
  expect(readRunMetadata(config({ filteredProjects: 'x' })).browser).toBeNull();
  expect(readRunMetadata(config({ filteredProjects: [p('x'.repeat(10_000))] })).browser).toHaveLength(META_MAX);
});

it('browser: a report with thousands of projects stays bounded', () => {
  const many = Array.from({ length: 50_000 }, (_, i) => ({ use: { defaultBrowserType: `b${i}` } }));
  const t = performance.now();
  const b = readRunMetadata(config({ filteredProjects: many })).browser!;
  expect(performance.now() - t).toBeLessThan(200);
  expect(b.length).toBeLessThanOrEqual(META_MAX);
});

it('shard: config.shard {current, total}, integers of at least 1', () => {
  expect(readRunMetadata(config({ shard: { current: 2, total: 4 } })).shard).toEqual({ current: 2, total: 4 });
  for (const shard of [null, undefined, {}, { current: 0, total: 2 }, { current: -1, total: 2 }, { current: 1, total: 0 }, { current: 1.5, total: 2 }, { current: '1', total: 2 }, { current: NaN, total: 2 }, { current: Infinity, total: 2 }, 3, 'x', []]) {
    expect(readRunMetadata(config({ shard })).shard).toBeNull();
  }
});

it('os: nothing in a Playwright report names the machine; only a custom config.metadata.os counts', () => {
  expect(readRunMetadata(config()).os).toBeNull();
  expect(readRunMetadata(config({ filteredProjects: [{ use: { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' } }] })).os).toBeNull();
  expect(readRunMetadata({ metadata: { os: ' linux\n' } }).os).toBe('linux');
  expect(readRunMetadata({ metadata: { os: 'o'.repeat(500) } }).os).toHaveLength(META_MAX);
  expect(readRunMetadata({ metadata: { os: { a: 1 } } }).os).toBeNull();
});

it('missing config or metadata gives null for every field', () => {
  const none = { commit: null, branch: null, browser: null, shard: null, os: null };
  for (const c of [undefined, null, {}, { metadata: null }, { metadata: 'x' }, { metadata: { gitCommit: null } }, 'x', 5, []]) {
    expect(readRunMetadata(c)).toEqual(none);
  }
});

it('cleanMeta is linear on hostile text', () => {
  const t = performance.now();
  cleanMeta('\u0000'.repeat(5_000_000));
  cleanMeta(' '.repeat(5_000_000) + 'x');
  expect(performance.now() - t).toBeLessThan(500);
});

it('arbitrary metadata never throws and always gives text of at most 200 characters, a valid shard or null', () => {
  fc.assert(
    fc.property(fc.anything({ maxDepth: 4 }), fc.anything({ maxDepth: 3 }), fc.anything(), (metadata, shard, filteredProjects) => {
      const r = readRunMetadata({ metadata, shard, filteredProjects });
      for (const k of ['commit', 'branch', 'browser', 'os'] as const) expect(r[k] === null || (typeof r[k] === 'string' && r[k]!.length <= META_MAX)).toBe(true);
      expect(r.shard === null || (Number.isInteger(r.shard.current) && r.shard.current >= 1 && Number.isInteger(r.shard.total) && r.shard.total >= 1)).toBe(true);
    }),
    { numRuns: 300 },
  );
});
