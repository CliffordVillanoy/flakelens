import { it, expect } from 'vitest';
import type { Test, TestScore } from '../types';
import { rankTests } from './rank';

const mk = (p: Partial<TestScore> & { testId: string }): TestScore => ({
  label: 'stable',
  wasFlakyEarlier: false,
  isNew: false,
  score: 0,
  priority: 0,
  mixedCommits: 0,
  repeatedCommits: 0,
  flipRate: 0,
  recentFailRate: 0,
  attempts: 0,
  runs: 0,
  retries: 0,
  wastedMs: 0,
  possibleWastedMs: 0,
  durationUnknown: false,
  firstSeenRunId: 'run0',
  lastFailedRunId: null,
  ...p,
});
const t = (testId: string, file: string, title: string): Test => ({ testId, testKey: testId, file, suitePath: [], title, project: '' });
const tests = [
  t('x', 'b.spec.ts', 'a'),
  t('y', 'a.spec.ts', 'z'),
  t('z', 'a.spec.ts', 'b'),
  ...['t0', 't1', 't2', 't3', 't4', 'a', 'b', 'c'].map((id) => t(id, 'f.spec.ts', id)),
];

it('orders by group', () => {
  const labels = ['stable', 'insufficient', 'failing', 'suspect', 'flaky'] as const;
  const r = rankTests(labels.map((l, i) => mk({ testId: `t${i}`, label: l })), tests);
  expect(r.map((s) => s.label)).toEqual(['flaky', 'suspect', 'failing', 'stable', 'insufficient']);
});

it('orders flaky by priority, not score alone', () => {
  const a = mk({ testId: 'a', label: 'flaky', score: 90, wastedMs: 60_000 }); // priority 0.9
  const b = mk({ testId: 'b', label: 'flaky', score: 50, wastedMs: 600_000 }); // priority 5
  const r = rankTests([a, b], tests);
  expect(r.map((s) => s.testId)).toEqual(['b', 'a']);
  expect(r[0]!.priority).toBeCloseTo(5);
  expect(r[1]!.priority).toBeCloseTo(0.9);
});

it('orders other groups by score', () => {
  for (const label of ['suspect', 'failing', 'stable', 'insufficient'] as const) {
    // c has the higher priority but the lower score; score must win outside flaky
    const a = mk({ testId: 'a', label, score: 80, wastedMs: 0 });
    const c = mk({ testId: 'c', label, score: 20, wastedMs: 6_000_000 });
    expect(rankTests([c, a], tests).map((s) => s.testId)).toEqual(['a', 'c']);
  }
});

it('breaks ties by file then title', () => {
  const r = rankTests(['x', 'y', 'z'].map((id) => mk({ testId: id, label: 'stable', score: 0 })), tests);
  expect(r.map((s) => s.testId)).toEqual(['z', 'y', 'x']);
});

it('does not change its input array', () => {
  const input = [mk({ testId: 'a', label: 'stable', score: 10 }), mk({ testId: 'b', label: 'flaky', score: 50, wastedMs: 60_000 })];
  const snapshot = structuredClone(input);
  const r = rankTests(input, tests);
  expect(input).toEqual(snapshot);
  expect(r).not.toBe(input);
  expect(r[0]).not.toBe(input[1]);
});
