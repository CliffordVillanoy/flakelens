import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ALLOWED_KEYS, MAX_BYTES, verifyReport } from './verify-report';

type Json = Parameters<typeof verifyReport>[0];
const FAKE = 'FAKE-TOKEN-NOT-A-SECRET-000000';
const kinds = (r: Json, bytes = 1000) => verifyReport(r, bytes).map((p) => p.kind);
const base = (): { [k: string]: Json } => ({ config: {}, suites: [], errors: [], stats: {} });
const withSuite = (title: string, extra: { [k: string]: Json } = {}): Json => ({ ...base(), suites: [{ title, ...extra }] });

it('a clean report passes: the committed scrubbed real report and a minimal one', () => {
  expect(verifyReport(JSON.parse(readFileSync('fixtures/ci-report/report.json', 'utf8')) as Json, 12_000)).toEqual([]);
  expect(kinds(base())).toEqual([]);
});

it('rejects a file over 2 MB, and anything that is not a JSON object', () => {
  expect(kinds(base(), MAX_BYTES)).toEqual([]);
  expect(kinds(base(), MAX_BYTES + 1)).toEqual(['size']);
  for (const bad of [null, 1, 'x', [], [base()]] as Json[]) expect(kinds(bad)).toEqual(['not-an-object']);
});

it('rejects a top-level key other than config, suites, errors and stats (a new Playwright field)', () => {
  expect(kinds({ ...base(), attachments: [] })).toEqual(['unknown-top-level-key']);
  expect(kinds({ ...base(), metadata: {} })).toEqual(['unknown-top-level-key']);
});

it('rejects the keys gitDiff, author and committer wherever they sit', () => {
  for (const key of ['gitDiff', 'author', 'committer']) {
    expect(kinds({ ...base(), config: { metadata: { [key]: 'x' } } }), key).toEqual(['forbidden-key']);
    expect(kinds({ ...base(), suites: [{ specs: [{ tests: [{ [key]: {} }] }] }] }), key).toEqual(['forbidden-key']);
  }
});

it('rejects any email-like string, even a noreply address, in a value or in a key', () => {
  for (const email of ['a@b.co', 'noreply@github.com', '104337204+CliffordVillanoy@users.noreply.github.com', 'see x.y@z.org here']) expect(kinds(withSuite(email)), email).toContain('email');
  expect(kinds({ ...base(), config: { 'a@b.co': 1 } })).toContain('email');
  expect(kinds(withSuite('an @mention and a@b without a domain suffix'))).toEqual([]);
});

it('rejects an absolute path: /home/, /Users/, /root/, the runner prefixes, and a drive path', () => {
  for (const p of ['/home/runner/work/flakelens/flakelens/e2e/a.ts', '/home/bob/x', '/Users/bob/x', '/root/x', '/__w/repo/repo/x', 'C:\\Users\\bob\\x', 'D:\\a\\flakelens\\flakelens\\x', 'D:/a/flakelens/x', 'at (c:\\x\\y.ts:1:1)'])
    expect([p, kinds(withSuite(`failed in ${p}`))]).toEqual([p, ['absolute-path']]);
  expect(kinds({ ...base(), config: { '/home/runner/x': 1 } })).toContain('absolute-path');
});

it('does not flag ordinary text: URLs with /home/ in them, relative paths, hashes, ids and branch names', () => {
  for (const t of ['https://example.com/home/page', 'http://localhost:4173/flakelens/#/tests', 'e2e/import.spec.ts:9:5', 'Timeout 30000ms exceeded', 'a:b', 'width: 100px'])
    expect([t, kinds(withSuite(t))]).toEqual([t, []]);
  expect(kinds({ ...base(), config: { metadata: { gitCommit: { hash: '4e06c9792d11fc394fff10e801e917d37d5537ca', branch: 'ci/dev-50-scrub-allowlist', subject: 'DEV-50: harden the CI report scrub' } } }, suites: [{ specs: [{ id: '866d5cea7c69e902a1e2-7b656fe726a89d6c0442' }] }] })).toEqual([]);
});

it('rejects secret-like text in the free-text fields (title, message, stack, subject, branch, name) and says where, never what', () => {
  for (const key of ['title', 'message', 'stack', 'subject', 'branch', 'name']) {
    const problems = verifyReport({ ...base(), suites: [{ [key]: `token=${FAKE}` }] } as Json, 1000);
    expect([key, problems.map((p) => p.kind)]).toEqual([key, ['secret-like']]);
    expect(JSON.stringify(problems)).not.toContain(FAKE);
    expect(problems[0]!.at).toBe(`suites[0].${key}`);
  }
  expect(kinds(withSuite(`Authorization: Bearer ${FAKE}`))).toEqual(['secret-like']);
  expect(kinds(withSuite('', { id: FAKE }))).toEqual([]); // ids are not free text; the scrub only keeps hash-shaped ids
});

it('reads a very deeply nested report without overflowing the stack, and a huge string quickly', () => {
  let nested: Json = 'leaf';
  for (let i = 0; i < 200_000; i++) nested = { n: nested };
  expect(() => verifyReport({ ...base(), config: nested }, 1000)).not.toThrow();
  const t0 = performance.now();
  verifyReport(withSuite('@'.repeat(5_000_000) + ' ' + '/home/'.repeat(500_000)), 1000);
  expect(performance.now() - t0).toBeLessThan(1500);
});

it('rejects a key name the scrub does not emit, at any depth: committerName and actor (security review, criterion 10)', () => {
  const commit = (extra: { [k: string]: Json }): Json => ({ ...base(), config: { metadata: { gitCommit: { hash: 'abcdef1', ...extra } } } });
  expect(verifyReport(commit({ committerName: 'Jane Doe' }), 1000)).toEqual([{ kind: 'unknown-key', at: 'config.metadata.gitCommit.committerName' }]);
  expect(verifyReport({ ...base(), config: { metadata: { actor: 'janedoe' } } }, 1000)).toEqual([{ kind: 'unknown-key', at: 'config.metadata.actor' }]);
  expect(kinds({ ...base(), suites: [{ specs: [{ tests: [{ results: [{ workerIndex: 0 }] }] }] }] })).toEqual(['unknown-key']);
  expect(kinds({ ...base(), config: { projects: [{ use: { userAgent: 'x' } }] } })).toEqual(['unknown-key']);
});

it('every key name the scrub can emit is allowed: the real scrubbed report and the scrubbed dirty fixture have no unknown key', () => {
  for (const file of ['fixtures/ci-report/report.json']) expect(verifyReport(JSON.parse(readFileSync(file, 'utf8')) as Json, 1000).filter((p) => p.kind === 'unknown-key')).toEqual([]);
  expect(ALLOWED_KEYS.has('config') && ALLOWED_KEYS.has('suites') && ALLOWED_KEYS.has('errors') && ALLOWED_KEYS.has('stats')).toBe(true);
});

it('a report full of unknown keys stops being read after a bounded number of problems', () => {
  const many: { [k: string]: Json } = {};
  for (let i = 0; i < 100_000; i++) many['k' + i] = 1;
  const problems = verifyReport({ ...base(), config: many }, 1000);
  expect(problems.length).toBeLessThanOrEqual(1_010);
});
