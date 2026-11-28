import { it, expect } from 'vitest';
import { buildDataset } from '@/engine/score/testkit';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import type { AttemptStatus, Dataset } from '@/engine/types';
import { CSV_HEADER, FILES, buildReport, csvFile, formatDuration, jsonFile, reportMarkdown, scopeRows } from './exportData';
import { groupRows, sortRows, RANK_SORT, tableRows, type Row } from './selectors';

const FAKE = 'FAKE-TOKEN-NOT-A-SECRET-000000';
const S = (...s: AttemptStatus[]) => s;
const rowsOf = (ds: Dataset): Row[] => tableRows(ds, rankTests(scoreTests(ds), ds.tests));
const inOrder = (rows: Row[]) => groupRows(sortRows(rows, RANK_SORT)).flatMap((g) => g.rows);
const NOW = new Date('2026-11-25T12:00:00.000Z');

// flaky (mixed commits), failing, stable, and one that has too little data
const fixture = (): Dataset => {
  const ds = buildDataset([
    { commit: 'aaaaaaa1', tests: { flaky: S('pass'), failing: S('fail'), stable: S('pass'), lonely: S('pass') } },
    { commit: 'bbbbbbb2', tests: { flaky: S('fail', 'pass'), failing: S('fail'), stable: S('pass') } },
    { commit: 'bbbbbbb2', tests: { flaky: S('pass'), failing: S('fail'), stable: S('pass') } },
    { commit: 'ccccccc3', tests: { flaky: S('fail', 'fail'), failing: S('fail'), stable: S('pass') } },
  ], 3100);
  ds.runs.forEach((r, i) => (r.startedAt = `2026-11-${String(20 + i).padStart(2, '0')}T10:00:00.000Z`));
  ds.imports = ds.runs.map((r) => ({ importId: r.importId, fileName: `run-${r.order}.json`, importedAt: NOW.toISOString(), result: 'success' as const, counts: { found: 1, imported: 1, notImported: 0 }, notices: [], runIds: [r.runId] }));
  return ds;
};
const input = (ds = fixture(), over: Partial<Parameters<typeof csvFile>[0]> = {}) => ({ rows: inOrder(rowsOf(ds)), ds, sample: false, scope: 'all' as const, version: '0.1.0', now: NOW, ...over });

// ---- CSV ----
it('CSV: a byte-order mark, the 13 columns in order, one row per test in the order given, CRLF line ends', () => {
  const csv = csvFile(input());
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  const lines = csv.slice(1).split('\r\n');
  expect(lines[0]).toBe('rank,test,file,project,status,score,mixed commits,flip rate,attempts,wasted minutes,evidence,first seen,last failed');
  expect(CSV_HEADER).toHaveLength(13);
  expect(lines).toHaveLength(1 + 4);
  expect(lines[1]!.startsWith('1,flaky,')).toBe(true); // the flaky test, rank 1, first in table order
  expect(lines.slice(1).map((l) => l.split(',')[1])).toEqual(inOrder(rowsOf(fixture())).map((r) => r.test.title));
});

it('CSV: values of the flaky row', () => {
  const [, flaky] = csvFile(input()).slice(1).split('\r\n');
  const cells = flaky!.split(',');
  expect(cells[0]).toBe('1'); // rank among Flaky tests
  expect(cells[4]).toBe('Flaky');
  expect(cells[6]).toBe('1'); // mixed commits
  expect(cells.at(-2)).toMatch(/^2026-11-2\d/); // first seen
});

it('CSV: names with a newline, a leading =, commas and quotes stay in one safe cell', () => {
  const ds = fixture();
  ds.tests.find((t) => t.testId === 'flaky')!.title = '=HYPERLINK("http://x","y")\n2, "q"';
  ds.tests.find((t) => t.testId === 'failing')!.title = '+cmd|calc';
  ds.tests.find((t) => t.testId === 'stable')!.file = '@file, with comma.spec.ts';
  const csv = csvFile(input(ds));
  expect(csv).toContain(`"'=HYPERLINK(""http://x"",""y"") 2, ""q"""`);
  expect(csv).toContain("'+cmd|calc");
  expect(csv).toContain('"\'@file, with comma.spec.ts"');
  expect(csv.slice(1).split('\r\n')).toHaveLength(5); // the newline in a name did not add a row
});

it('CSV: sample data adds a marker column "data" with "sample data" on every row; real data has no such column', () => {
  const sample = csvFile(input(fixture(), { sample: true })).slice(1).split('\r\n');
  expect(sample[0]!.endsWith(',data')).toBe(true);
  for (const line of sample.slice(1)) expect(line.endsWith(',sample data')).toBe(true);
  expect(csvFile(input()).slice(1).split('\r\n')[0]!.endsWith(',last failed')).toBe(true);
});

it('CSV and JSON: a token in a name is masked, and the raw failure text is never in a file', () => {
  const ds = fixture();
  ds.tests.find((t) => t.testId === 'flaky')!.title = `checkout token=${FAKE}`;
  ds.failures.push({ attemptId: ds.attempts.find((a) => a.status === 'fail')!.attemptId, message: `Authorization: Bearer ${FAKE}`, stack: `at x token=${FAKE}` });
  const csv = csvFile(input(ds));
  const json = jsonFile(input(ds));
  expect(csv).not.toContain('FAKE-TOKEN');
  expect(json).not.toContain('FAKE-TOKEN');
  expect(csv).toContain('[redacted]');
});

// ---- JSON ----
it('JSON: { app, version, exportedAt, scope, tests } with the same tests in the same order', () => {
  const data = JSON.parse(jsonFile(input()));
  expect(Object.keys(data)).toEqual(['app', 'version', 'exportedAt', 'scope', 'tests']);
  expect(data).toMatchObject({ app: 'FlakeLens', version: '0.1.0', exportedAt: NOW.toISOString(), scope: 'all' });
  expect(data.tests.map((t: { test: string }) => t.test)).toEqual(['flaky', 'failing', 'stable', 'lonely']);
  expect(data.tests[0]).toMatchObject({ rank: 1, test: 'flaky', file: 'x.spec.ts', project: '', status: 'Flaky', mixedCommits: 1 });
  expect(typeof data.tests[0].score).toBe('number');
  expect(data.tests[1].rank).toBeNull(); // only Flaky tests have a fix-priority rank
  expect('sample' in data).toBe(false);
});

it('JSON: sample data says sample: true', () => {
  const data = JSON.parse(jsonFile(input(fixture(), { sample: true, scope: 'view' })));
  expect(data.sample).toBe(true);
  expect(data.scope).toBe('view');
});

it('file names are constants', () => {
  expect(FILES).toEqual({ csv: 'flakelens-tests.csv', json: 'flakelens-tests.json', md: 'flakelens-report.md' });
});

it('scope: current view is the rows in view, all tests is every row', () => {
  const all = inOrder(rowsOf(fixture()));
  const view = all.slice(0, 2);
  expect(scopeRows(all, view, 'view')).toBe(view);
  expect(scopeRows(all, view, 'all')).toBe(all);
});

it('5,000 tests export as CSV and JSON in under a second each', () => {
  const tests: Record<string, AttemptStatus[]> = {};
  for (let i = 0; i < 5000; i++) tests[`suite ${i % 40} › test ${i}`] = i % 7 === 0 ? S('fail', 'pass') : S('pass');
  const ds = buildDataset(Array.from({ length: 6 }, (_, r) => ({ commit: `c${r}`, tests })));
  const rows = inOrder(rowsOf(ds));
  expect(rows).toHaveLength(5000);
  const t0 = performance.now();
  const csv = csvFile({ rows, ds, sample: false, scope: 'all', version: '0.1.0', now: NOW });
  const t1 = performance.now();
  const json = jsonFile({ rows, ds, sample: false, scope: 'all', version: '0.1.0', now: NOW });
  const t2 = performance.now();
  expect(csv.split('\r\n')).toHaveLength(5001);
  expect(JSON.parse(json).tests).toHaveLength(5000);
  expect(t1 - t0).toBeLessThan(1000);
  expect(t2 - t1).toBeLessThan(1000);
});

// ---- report ----
it('durations read "12 min", "3 h 12 min", and under a minute with a decimal', () => {
  expect(formatDuration(12 * 60_000)).toBe('12 min');
  expect(formatDuration(192 * 60_000)).toBe('3 h 12 min');
  expect(formatDuration(60 * 60_000)).toBe('1 h 0 min');
  expect(formatDuration(30_000)).toBe('0.5 min');
  expect(formatDuration(0)).toBe('0 min');
});

it('report Markdown follows board 14: title, meta, summary, top Flaky tests, footer; names go through escapeMd', () => {
  const ds = fixture();
  ds.tests.find((t) => t.testId === 'flaky')!.title = 'applies `coupon` <b>code</b> https://x.io';
  const causes = new Map([['flaky', { cause: 'Timing and waits', level: 'medium' as const }]]);
  const model = buildReport({ ...input(ds), causes });
  const md = reportMarkdown(model);
  const lines = md.split('\n');
  expect(lines[0]).toBe('# FlakeLens report');
  expect(md).toContain('25 Nov 2026 · 4 files · 4 runs · 4 tests · Scope: all tests');
  expect(md).toContain('## Summary');
  expect(md).toContain('- 1 Flaky, 0 Unproven, 1 Failing, 1 Stable, 1 Not enough data');
  expect(md).toMatch(/- Wasted CI time: .* from Flaky tests/);
  expect(md).toContain('## Top Flaky tests');
  expect(md).toMatch(/1\. applies \\`coupon\\` \\<b\\>code\\<\/b\\> https:​\/\/x\.io/);
  expect(md).toContain('   Failed 3 of 6 attempts, mixed results on 1 commit · ');
  expect(md).toContain('   Likely cause: Timing and waits (medium confidence)');
  expect(md.trimEnd().endsWith('Generated by FlakeLens 0.1.0. Rankings are starting values and are not calibrated. Causes are likely, not certain.')).toBe(true);
  expect(md).not.toContain('This report uses sample data');
});

it('report: sample data says so inside the file, right under the meta line', () => {
  const md = reportMarkdown(buildReport({ ...input(fixture(), { sample: true }) }));
  const lines = md.split('\n');
  const meta = lines.findIndex((l) => l.includes('· Scope:'));
  expect(lines.slice(meta + 1, meta + 4).join('\n')).toContain('This report uses sample data. It says so inside the file.');
});

it('report: a likely cause is shown only when given, and at most ten tests are listed, in fix-priority order', () => {
  const tests: Record<string, AttemptStatus[]> = {};
  for (let i = 0; i < 15; i++) tests[`t${i}`] = S('fail', 'pass');
  const ds = buildDataset([
    { commit: 'a', tests: Object.fromEntries(Object.keys(tests).map((k) => [k, S('pass')])) },
    { commit: 'b', tests },
    { commit: 'b', tests: Object.fromEntries(Object.keys(tests).map((k) => [k, S('pass')])) },
  ]);
  const model = buildReport(input(ds));
  expect(model.items).toHaveLength(10);
  expect(model.items.every((i) => i.cause === null)).toBe(true);
  expect(reportMarkdown(model)).not.toContain('Likely cause');
});

it('report: no Flaky tests in scope lists the summary only, with the sentence', () => {
  const ds = buildDataset([{ tests: { a: S('pass') } }, { tests: { a: S('pass') } }]);
  const md = reportMarkdown(buildReport(input(ds)));
  expect(md).toContain('## Top Flaky tests');
  expect(md).toContain('No Flaky tests in this scope. The report lists the summary only.');
  expect(md).toContain('## Summary');
});

it('report: the current view scope names itself, and counts only the rows in scope', () => {
  const ds = fixture();
  const view = inOrder(rowsOf(ds)).slice(0, 2);
  const md = reportMarkdown(buildReport({ ...input(ds), rows: view, scope: 'view' }));
  expect(md).toContain('· 2 tests · Scope: current view');
  expect(md).toContain('- 1 Flaky, 0 Unproven, 1 Failing, 0 Stable, 0 Not enough data');
});

it('report: the fake token never appears, whatever the failures hold', () => {
  const ds = fixture();
  for (const a of ds.attempts.filter((x) => x.status === 'fail')) ds.failures.push({ attemptId: a.attemptId, message: `Bearer ${FAKE}`, stack: `token=${FAKE}` });
  ds.tests.find((t) => t.testId === 'flaky')!.title = `login api_key=${FAKE}`;
  const causes = new Map([['flaky', { cause: `Timing token=${FAKE}`, level: 'high' as const }]]);
  const md = reportMarkdown(buildReport({ ...input(ds), causes }));
  expect(md).not.toContain('FAKE-TOKEN');
  expect(md).toContain('\\[redacted\\]'); // masked first, then escaped
});

it('report: a hostile name is one line of text', () => {
  const ds = fixture();
  ds.tests.find((t) => t.testId === 'flaky')!.title = 'a\n## injected\n- item';
  const md = reportMarkdown(buildReport(input(ds)));
  expect(md).not.toMatch(/^## injected/m);
  expect(md.split('\n').filter((l) => l.startsWith('## '))).toEqual(['## Summary', '## Top Flaky tests']);
});
