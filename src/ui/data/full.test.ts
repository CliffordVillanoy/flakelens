import { it, expect } from 'vitest';
import type { CorrelationResult, ValueRow } from '@/engine/correlate/correlate';
import { buildDataset } from '@/engine/score/testkit';
import type { AttemptStatus, Dataset } from '@/engine/types';
import { corrBoxes, fullStats, logEntries, timelineRows } from './full';
import { tableRows } from './selectors';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';

const rowOf = (ds: Dataset, id = 't') => tableRows(ds, rankTests(scoreTests(ds), ds.tests)).find((r) => r.score.testId === id)!;
const history = (runs: AttemptStatus[][]) => buildDataset(runs.map((a, i) => ({ commit: `c${Math.floor(i / 2)}`, tests: { t: a } })));
// give runs a start time, an import with a file name, and failure messages
function decorate(ds: Dataset, texts: Record<string, string> = {}): Dataset {
  ds.runs.forEach((r, i) => {
    r.startedAt = `2026-11-${String(10 + i).padStart(2, '0')}T02:14:00.000Z`;
    ds.imports.push({ importId: r.importId, fileName: `nightly-${10 + i}.json`, importedAt: r.startedAt, result: 'success', counts: { found: 1, imported: 1, notImported: 0 }, notices: [], runIds: [r.runId] });
  });
  for (const a of ds.attempts) if (a.status === 'fail') ds.failures.push({ attemptId: a.attemptId, message: texts[a.attemptId] ?? `boom ${a.attemptId}`, stack: '' });
  return ds;
}

it('stats: attempts failed of total, passed on retry, wasted time', () => {
  const ds = history([['fail', 'pass'], ['pass'], ['fail', 'fail'], ['pass']]);
  const s = fullStats(rowOf(ds), ds);
  expect(s.failed).toBe(3);
  expect(s.total).toBe(6);
  expect(s.retry).toBe(1);
  expect(typeof s.wasted).toBe('string');
});

it('timeline: newest first, file name, short commit, a label tag, result words, and the time of the attempts', () => {
  const ds = decorate(history([['pass'], ['fail', 'pass'], ['fail', 'fail'], ['pass'], ['fail']]));
  ds.runs[3]!.reportCommit = 'abcdef1234567'; // a label replaced the commit of run 4
  ds.runs[3]!.commit = 'release-1';
  const rows = timelineRows(ds, 't');
  expect(rows.map((r) => r.name)).toEqual(['nightly-14.json', 'nightly-13.json', 'nightly-12.json', 'nightly-11.json', 'nightly-10.json']);
  expect(rows.map((r) => r.number)).toEqual([5, 4, 3, 2, 1]);
  expect(rows.map((r) => r.result)).toEqual(['Failed', 'Passed', 'Failed twice', 'Failed, then passed on retry', 'Passed']);
  expect(rows[1]).toMatchObject({ commit: 'release-1', labelled: true });
  expect(rows[0]).toMatchObject({ commit: 'c2', labelled: false });
  expect(rows[2]!.kinds).toEqual(['fail', 'fail']);
  expect(rows[0]!.ms).toBe(1000);
  expect(rows[2]!.ms).toBe(2000);
});

it('timeline: a run with a run time of nothing shows no time, and many failures are counted in words', () => {
  const ds = decorate(history([['fail', 'fail', 'fail', 'pass'], ['skip']]));
  ds.attempts.forEach((a) => (a.durationMs = null));
  const rows = timelineRows(ds, 't');
  expect(rows[1]!.result).toBe('Fail, fail, fail, passed on retry'); // an uncommon mix lists each attempt
  expect(rows[1]!.ms).toBeNull();
  expect(rows[0]!.result).toBe('Skipped');
});

it('log entries: every failed attempt, newest run first, with the raw text of the failure', () => {
  const ds = decorate(history([['fail', 'pass'], ['fail', 'fail']]), { 'run0:t:0': 'first failure\nline 2', 'run1:t:1': 'last failure' });
  const entries = logEntries(ds, 't');
  expect(entries.map((e) => [e.runNumber, e.attempt, e.total])).toEqual([[2, 2, 2], [2, 1, 2], [1, 1, 2]]);
  expect(entries[0]).toMatchObject({ name: 'nightly-11.json', raw: 'last failure' });
  expect(entries[2]!.raw).toBe('first failure\nline 2');
});

it('log entries: the text is the failure text the classifier reads (the stack when it starts with the message, else both)', () => {
  const ds = decorate(history([['fail']]));
  ds.failures[0] = { attemptId: 'run0:t:0', message: 'Error: boom', stack: 'Error: boom\n    at a.ts:1' };
  expect(logEntries(ds, 't')[0]!.raw).toBe('Error: boom\n    at a.ts:1');
  ds.failures[0] = { attemptId: 'run0:t:0', message: 'msg', stack: 'at a.ts:1' };
  expect(logEntries(ds, 't')[0]!.raw).toBe('msg\nat a.ts:1');
});

it('log entries: a failed attempt with no failure record has empty text; a test that never failed has none', () => {
  const ds = decorate(history([['fail'], ['pass']]));
  ds.failures.length = 0;
  expect(logEntries(ds, 't')).toHaveLength(1);
  expect(logEntries(ds, 't')[0]!.raw).toBe('');
  expect(logEntries(decorate(history([['pass'], ['pass']])), 't')).toEqual([]);
});

// ---- correlation boxes ----
const val = (value: string, failed: number, attempts: number): ValueRow => ({ value, failed, attempts, rate: failed / attempts });
const base = (dimension: CorrelationResult['dimension'], over: Partial<CorrelationResult> = {}): CorrelationResult => ({
  dimension, status: 'missing', values: [], others: { failed: 0, attempts: 0, rate: 0 }, pointsHigher: 0, oddsRatio: 1, adjustedP: 1, comparisons: 1, ...over,
});
const finding = (dimension: CorrelationResult['dimension'], p: number, over: Partial<CorrelationResult> = {}) =>
  base(dimension, {
    status: 'finding', strength: 'Strong', highlightedValue: 'webkit', adjustedP: p, comparisons: 3, pointsHigher: 70, oddsRatio: 42.3,
    values: [val('chromium', 2, 12), val('firefox', 0, 4), val('webkit', 7, 8)], others: { failed: 2, attempts: 16, rate: 0.125 }, ...over,
  });

it('a finding reads as one plain sentence with the counts, the bars, and the method behind a closed block', () => {
  const [box] = corrBoxes([finding('browser', 0.003)]);
  expect(box).toMatchObject({ dimension: 'browser', label: 'Browser', status: 'finding', strength: 'Strong', open: true });
  expect(box!.text).toBe('Fails more on webkit: 7 of 8 attempts, against 2 of 16 elsewhere. A clue, not proof.');
  expect(box!.bars).toEqual([
    { value: 'webkit', counts: '7 of 8 · 88%', pct: 88, highlighted: true },
    { value: 'chromium', counts: '2 of 12 · 17%', pct: 17, highlighted: false },
    { value: 'firefox', counts: '0 of 4 · 0%', pct: 0, highlighted: false },
  ]);
  expect(box!.how).toBe("Compared the values using a chi-square test. webkit against the rest: odds ratio 42, adjusted p 0.003 (corrected for 3 comparisons). Strength: Strong.");
});

it('two values are compared with Fisher exact, three or more with chi-square', () => {
  const two = finding('browser', 0.0004, { values: [val('a', 1, 10), val('webkit', 9, 10)] });
  expect(corrBoxes([two])[0]!.how).toContain("Fisher's exact test");
  expect(corrBoxes([two])[0]!.how).toContain('adjusted p <0.001');
  expect(corrBoxes([finding('browser', 0.003)])[0]!.how).toContain('chi-square');
});

it('only the strongest finding is open; the other findings are closed', () => {
  const boxes = corrBoxes([finding('browser', 0.02, { strength: 'Moderate' }), finding('shard', 0.001), finding('os', 0.5, { strength: 'Weak' })]);
  expect(boxes.map((b) => b.open)).toEqual([false, true, false]);
});

it('no clear link lists what was seen; not enough data gives the numbers; a missing dimension says what is missing', () => {
  const none = base('os', { status: 'none', values: [val('Linux', 6, 20), val('Windows', 3, 8)], adjustedP: 1 });
  expect(corrBoxes([none])[0]!.text).toBe('No clear link (Linux 6 of 20, Windows 3 of 8).');
  const notEnough = base('shard', { status: 'notEnough', values: [val('1 of 2', 1, 5), val('2 of 2', 1, 4)], reason: { minAttempts: 10, minFails: 3, minGroup: 3, attempts: 9, fails: 2, smallestGroup: 4 } });
  expect(corrBoxes([notEnough])[0]!.text).toBe('Not enough data yet. Needs 10 attempts and 3 failures; you have 9 and 2.');
  const smallGroup = base('shard', { status: 'notEnough', values: [val('a', 5, 18), val('b', 2, 2)], reason: { minAttempts: 10, minFails: 3, minGroup: 3, attempts: 20, fails: 7, smallestGroup: 2 } });
  expect(corrBoxes([smallGroup])[0]!.text).toBe('Not enough data yet. Each group needs 3 attempts; the smallest has 2.');
  expect(corrBoxes([base('hour')])[0]!.text).toBe('No start times in your files.');
  expect(corrBoxes([base('os')])[0]!.text).toBe('No operating system in your files.');
  for (const b of corrBoxes([none, notEnough, base('hour')])) expect(b).toMatchObject({ open: false, bars: [], how: null });
});

it('a missing or not-enough dimension never prints its neutral numbers, and none is dressed as a finding', () => {
  const boxes = corrBoxes([base('browser'), base('shard', { status: 'notEnough', reason: { minAttempts: 10, minFails: 3, minGroup: 3, attempts: 1, fails: 0, smallestGroup: 0 } })]);
  for (const b of boxes) {
    expect(b.strength).toBeUndefined();
    expect(b.text).not.toMatch(/points|odds|0%|Strong|Moderate|Weak/);
  }
});

it('hour values read as UTC clock hours; project is a dimension with its own label', () => {
  const hour = finding('hour', 0.001, { highlightedValue: '14', values: [val('03', 0, 10), val('14', 9, 10)], others: { failed: 0, attempts: 10, rate: 0 } });
  const h = corrBoxes([hour])[0]!;
  expect(h.label).toBe('Time of day');
  expect(h.text).toContain('Fails more on 14:00 UTC');
  expect(corrBoxes([finding('project', 0.001, { highlightedValue: 'chromium-mobile', values: [val('chromium', 0, 10), val('chromium-mobile', 9, 10)] })])[0]!.label).toBe('Project');
});

it('hostile values are plain text: control characters are cleaned and the length is bounded', () => {
  const evil = '<img src=x onerror=alert(1)>\u0007' + 'z'.repeat(500);
  const box = corrBoxes([finding('browser', 0.001, { highlightedValue: evil, values: [val(evil, 9, 10), val('b', 0, 10)], others: { failed: 0, attempts: 10, rate: 0 } })])[0]!;
  expect(box.text.length).toBeLessThan(400);
  expect(box.text).not.toContain('\u0007');
  expect(box.bars.every((b) => b.value.length <= 120)).toBe(true);
});

it('at most six bars are listed, the highest rates first', () => {
  const many = Array.from({ length: 10 }, (_, i) => val(`v${i}`, i, 20));
  const box = corrBoxes([finding('hour', 0.001, { highlightedValue: 'v9', values: many, others: { failed: 1, attempts: 20, rate: 0.05 } })])[0]!;
  expect(box.bars).toHaveLength(6);
  expect(box.bars.map((b) => b.pct)).toEqual([...box.bars.map((b) => b.pct)].sort((a, b) => b - a));
});
