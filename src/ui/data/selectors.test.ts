import { it, expect } from 'vitest';
import { buildDataset } from '@/engine/score/testkit';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import type { Dataset } from '@/engine/types';
import { t } from '../copy';
import { countLine, datasetSummary, escapeMd, failuresFor, filterRows, groupRows, health, sortRows, stripAnsi, summaryText, tableRows, topFlakyMarkdown, wastedText, type Row } from './selectors';

const rows = (ds: Dataset) => tableRows(ds, rankTests(scoreTests(ds), ds.tests));
const one = (ds: Dataset) => rows(ds)[0]!;
const text = (r: Row) => t(r.evidence.key, r.evidence.params);

it('evidence: mixed commits, number first', () => {
  const r = one(
    buildDataset([
      { commit: 'a', tests: { t: ['pass'] } },
      { commit: 'a', tests: { t: ['fail'] } },
      { commit: 'b', tests: { t: ['pass'] } },
    ]),
  );
  expect(r.score.label).toBe('flaky');
  expect(text(r)).toBe('1 of 2 commits had mixed results');
});

it('evidence: retry only when there is no commit info', () => {
  const r = one(buildDataset([{ tests: { t: ['fail', 'pass'] } }, { tests: { t: ['pass'] } }, { tests: { t: ['pass'] } }]));
  expect(text(r)).toBe('Passed on retry in 1 of 3 runs');
});

it('evidence: Unproven counts the switches', () => {
  const r = one(
    buildDataset(['a', 'a', 'b', 'b', 'c', 'c'].map((commit, i) => ({ commit, tests: { t: [i === 2 || i === 3 ? 'fail' : 'pass'] } }))),
  );
  expect(r.score.label).toBe('suspect');
  expect(text(r)).toBe('Switched pass and fail 2 times in 6 runs');
});

it('evidence: Failing, and Failing that was flaky names the commit where it started', () => {
  expect(text(one(buildDataset(Array(4).fill({ tests: { t: ['fail', 'fail'] } }))))).toBe('Failed 4 of 4 runs');
  const r = one(
    buildDataset([
      { commit: 'a1', tests: { t: ['fail', 'pass'] } },
      ...Array.from({ length: 10 }, () => ({ commit: 'b2c3d4e5f6', tests: { t: ['fail' as const] } })),
    ]),
  );
  expect(r.score.wasFlakyEarlier).toBe(true);
  expect(text(r)).toBe('Failed 10 of 10 runs since b2c3d4e');
});

it('evidence: Stable and Not enough data', () => {
  expect(text(one(buildDataset(Array(5).fill({ tests: { t: ['pass'] } }))))).toBe('Passed 5 of 5 runs');
  expect(text(one(buildDataset([{ tests: { t: ['pass'] } }])))).toBe('Only 1 attempt loaded');
});

it('wasted time: minutes for Flaky, an estimate for Unproven, a dash otherwise', () => {
  const ds = buildDataset([{ commit: 'a', tests: { t: ['fail', 'pass'] } }], 90_000);
  const [r] = rows(ds);
  expect(wastedText(r!.score)).toBe('2 min');
  expect(wastedText({ ...r!.score, wastedMs: 30_000 })).toBe('0.5 min');
  expect(wastedText({ ...r!.score, wastedMs: 200 })).toBe('0.1 min'); // never "0.0 min" for time that was wasted
  expect(wastedText({ ...r!.score, label: 'suspect', possibleWastedMs: 240_000 })).toBe('~4 min (est.)');
  expect(wastedText({ ...r!.score, label: 'stable' })).toBe('—');
  expect(wastedText({ ...r!.score, wastedMs: 0 })).toBe('—');
});

const mixed = () =>
  buildDataset([
    { commit: 'a', tests: { flaky1: ['fail', 'pass'], stable1: ['pass'], failing1: ['fail'] } },
    { commit: 'b', tests: { flaky1: ['pass'], stable1: ['pass'], failing1: ['fail'] } },
    { commit: 'c', tests: { flaky1: ['pass'], stable1: ['pass'], failing1: ['fail'], fresh: ['pass'] } },
  ]);

it('health counts every label and the wasted totals', () => {
  const ds = mixed();
  const h = health(rows(ds));
  expect(h.counts).toEqual({ flaky: 1, suspect: 0, failing: 1, stable: 1, insufficient: 1 });
  expect(h.total).toBe(4);
  expect(h.wastedMs).toBeGreaterThan(0);
});

it('dataset summary: tests, files, runs, commits and not-imported results', () => {
  const s = datasetSummary(mixed());
  expect(s).toMatchObject({ tests: 4, runs: 3, commits: 3, notImported: 0 });
});

it('groups in the order Flaky, Unproven, Failing, Stable, Not enough data and drops empty groups', () => {
  const g = groupRows(rows(mixed()));
  expect(g.map((x) => x.label)).toEqual(['flaky', 'failing', 'stable', 'insufficient']);
});

it('filters by status and by search in test name and file, case-insensitive', () => {
  const all = rows(mixed());
  expect(filterRows(all, { status: 'flaky', q: '' }).map((r) => r.test.title)).toEqual(['flaky1']);
  expect(filterRows(all, { status: 'all', q: 'STABLE' }).map((r) => r.test.title)).toEqual(['stable1']);
  expect(filterRows(all, { status: 'all', q: 'x.spec' })).toHaveLength(4);
  expect(filterRows(all, { status: 'bogus', q: '' })).toHaveLength(4); // unknown status from the URL means All
});

it('the count line picks the matching sentence', () => {
  expect(countLine(211, 'all', '')).toBe('Showing all 211 tests, grouped by status, most urgent first');
  expect(countLine(1, 'flaky', 'coupon')).toBe('Showing 1 Flaky test matching "coupon", grouped by status, most urgent first');
  expect(countLine(2, 'all', 'cart')).toBe('Showing 2 tests matching "cart", grouped by status, most urgent first');
});

it('builds rows for 5,000 tests and 50 runs quickly', () => {
  const runs = Array.from({ length: 50 }, (_, r) => ({
    commit: `c${r >> 1}`,
    tests: Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [`t${i}`, [(i + r) % 7 === 0 ? 'fail' : 'pass'] as ('pass' | 'fail')[]])),
  }));
  const ds = buildDataset(runs);
  const start = performance.now();
  const ranked = rankTests(scoreTests(ds), ds.tests);
  const r = tableRows(ds, ranked);
  const filtered = filterRows(r, { status: 'all', q: 't49' });
  const ms = performance.now() - start;
  expect(r).toHaveLength(5000);
  expect(filtered.length).toBeGreaterThan(0);
  expect(ms).toBeLessThan(5000);
});

it('the count line names the sort', () => {
  expect(countLine(3, 'all', '', { key: 'wasted', dir: 'desc' })).toBe('Showing all 3 tests, grouped by status, sorted by wasted time');
  expect(countLine(3, 'all', '', { key: 'test', dir: 'asc' })).toBe('Showing all 3 tests, grouped by status, sorted by test name');
});

const many = () =>
  buildDataset([
    { commit: 'a', tests: { 'b-flaky': ['fail', 'pass'], 'a-flaky': ['fail', 'pass'], 'c-flaky': ['fail', 'pass'], z: ['fail'], y: ['fail'] } },
    { commit: 'b', tests: { 'b-flaky': ['fail', 'pass'], 'a-flaky': ['pass'], 'c-flaky': ['fail', 'fail', 'pass'], z: ['fail'], y: ['fail'] } },
    { commit: 'c', tests: { 'b-flaky': ['pass'], 'a-flaky': ['pass'], 'c-flaky': ['pass'], z: ['fail'], y: ['fail'] } },
  ], 60_000);

it('sorting re-orders inside each group and never changes the group order', () => {
  const all = rows(many());
  const label = (r: Row[]) => r.map((x) => x.score.label);
  const byGroup = (r: Row[]) => groupRows(r).map((g) => [g.label, g.rows.map((x) => x.test.title)]);
  const rank = byGroup(all);
  const byName = byGroup(sortRows(all, { key: 'test', dir: 'asc' }));
  expect(byName.map((g) => g[0])).toEqual(rank.map((g) => g[0]));
  expect(byName[0]![1]).toEqual(['a-flaky', 'b-flaky', 'c-flaky']);
  expect(byGroup(sortRows(all, { key: 'test', dir: 'desc' }))[0]![1]).toEqual(['c-flaky', 'b-flaky', 'a-flaky']);
  const wasted = sortRows(all, { key: 'wasted', dir: 'desc' }).filter((r) => r.score.label === 'flaky').map((r) => r.score.wastedMs);
  expect(wasted).toEqual([...wasted].sort((a, b) => b - a));
  expect(label(sortRows(all, { key: 'rank', dir: 'asc' }))).toEqual(label(all));
  expect(sortRows(all, { key: 'rank', dir: 'asc' })).toEqual(all);
});

it('Markdown export escapes pipes, backticks and leading = + - @', () => {
  const BS = '\\';
  expect(escapeMd('a | b `c`')).toBe(`a ${BS}| b ${BS}\`c${BS}\``);
  for (const ch of ['=', '+', '-', '@']) expect(escapeMd(`${ch}SUM(A1)`)).toBe(`${BS}${ch}SUM(A1)`);
  expect(escapeMd('x-y')).toBe('x-y');
});

it('Markdown export: newlines, tabs and other control characters cannot start a new line or cell', () => {
  const BS = '\\';
  expect(escapeMd('ok\n=HYPERLINK("x")')).toBe(`ok =HYPERLINK("x")`);
  expect(escapeMd('\t+cmd')).toBe(`${BS}+cmd`);
  expect(escapeMd('a\r\n-b\u0000c d')).toBe('a -b c d');
  const all = rows(many());
  const evil = { ...all[0]!, test: { ...all[0]!.test, title: 'name\n2. fake line' } };
  expect(topFlakyMarkdown([evil]).split('\n')).toHaveLength(1);
});

it('Markdown export lists the top Flaky tests: rank, name, evidence, wasted minutes', () => {
  const BS = '\\';
  const all = rows(many());
  const lines = topFlakyMarkdown(all).split('\n');
  expect(lines).toHaveLength(3);
  expect(lines[0]).toMatch(/^1\. .+ — .+ — \d+(\.\d)? min$/);
  const evil = { ...all[0]!, test: { ...all[0]!.test, title: '=cmd|`x`' } };
  expect(topFlakyMarkdown([evil])).toBe(
    `1. ${BS}=cmd${BS}|${BS}\`x${BS}\` — ${t(all[0]!.evidence.key, all[0]!.evidence.params)} — ${wastedText(all[0]!.score)}`,
  );
});

it('failure text drops ANSI colour codes that Playwright puts in error messages', () => {
  const ds = buildDataset([{ commit: 'a', tests: { t: ['fail'] } }]);
  const ESC = String.fromCharCode(27);
  ds.failures = [{ attemptId: ds.attempts[0]!.attemptId, message: `${ESC}[2mexpect(${ESC}[22m${ESC}[31mreceived${ESC}[39m)`, stack: `${ESC}[1mat x${ESC}[22m` }];
  const [f] = failuresFor(ds, 't');
  expect(f!.message).toBe('expect(received)');
  expect(f!.stack).toBe('at x');
});

// DEV-31 item 1 and 2: hostile names and failure text.
const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);
const ST = String.fromCharCode(92); // the backslash that ends an OSC with ESC

it('the copy summary is cleaned: a newline or a leading = in a test name cannot forge lines', () => {
  const ds = buildDataset([{ commit: 'a', tests: { ['evil' + String.fromCharCode(10) + 'Status: Stable. Nothing to see.']: ['fail', 'pass'] } }]);
  const r = one(ds);
  const latest = { runNumber: 1, commit: 'abc1234', attempt: 1, total: 1, message: 'boom' + String.fromCharCode(10) + 'Wasted CI time: 0 min', stack: '', startedAt: null, passedAfter: null };
  const lines = summaryText(r, latest as never).split(String.fromCharCode(10));
  // title, status, (wasted when measured), failure, footer: no line the name or message could add
  expect(lines.filter((l) => l.startsWith('Status:'))).toHaveLength(1);
  expect(lines.filter((l) => l.startsWith('Wasted CI time:'))).toHaveLength(r.score.label === 'flaky' && r.score.wastedMs > 0 ? 1 : 0);
  expect(lines[0]).toContain('evil Status: Stable. Nothing to see.');
  expect(lines.some((l) => l.startsWith('Latest failure: run 1, commit abc1234: boom'))).toBe(true);
});

it('a name that starts with a newline and = stays on one line (a plain-text summary needs no formula escape)', () => {
  const r = one(buildDataset([{ commit: 'a', tests: { [String.fromCharCode(10) + '=HYPERLINK("x")']: ['pass'] } }]));
  const lines = summaryText(r, undefined).split(String.fromCharCode(10));
  expect(lines).toHaveLength(3); // title, status, footer
  expect(lines[0]).toContain('=HYPERLINK("x")');
});

it('stripAnsi removes colour, cursor and title sequences (CSI and OSC), and keeps plain text', () => {
  expect(stripAnsi(ESC + '[31mred' + ESC + '[0m')).toBe('red');
  expect(stripAnsi('a' + ESC + '[2K' + ESC + '[1Gb' + ESC + '[?25lc')).toBe('abc');
  expect(stripAnsi(ESC + ']0;window title' + BEL + 'text')).toBe('text');
  expect(stripAnsi(ESC + ']8;;http://x.test' + ESC + ST + 'link' + ESC + ']8;;' + ESC + ST)).toBe('link');
  expect(stripAnsi('plain [31m text')).toBe('plain [31m text'); // no escape character, nothing to strip
});

it('stripAnsi stays fast on hostile input (bounded patterns)', () => {
  const cases = [
    (ESC + '[').repeat(500_000),
    ESC + ']' + 'a'.repeat(1_000_000),
    ESC + '['.concat('1;'.repeat(500_000)),
    (ESC + '[1;').repeat(300_000),
    ESC.repeat(1_000_000),
  ];
  for (const c of cases) {
    const start = performance.now();
    stripAnsi(c);
    expect(performance.now() - start).toBeLessThan(500);
  }
});
