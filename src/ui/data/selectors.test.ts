import { it, expect } from 'vitest';
import { buildDataset } from '@/engine/score/testkit';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import type { Dataset } from '@/engine/types';
import { t } from '../copy';
import { countLine, datasetSummary, filterRows, groupRows, health, tableRows, wastedText, type Row } from './selectors';

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
  expect(text(r)).toBe('1 of 2 commits had both a pass and a fail');
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
  expect(text(r)).toBe('Switched between pass and fail 2 times in 6 runs');
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
  expect(text(r)).toBe('Failed 10 of 10 runs since b2c3d4e. Flaky before that');
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
