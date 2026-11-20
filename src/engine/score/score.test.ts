import { it, expect } from 'vitest';
import fc from 'fast-check';
import { scoreTests } from './score';
import { buildDataset } from './testkit';

const one = (runs: Parameters<typeof buildDataset>[0]) => scoreTests(buildDataset(runs))[0]!;

it('pass after retry in a single run is flaky', () => expect(one([{ tests: { t: ['fail', 'pass'] } }]).label).toBe('flaky'));

it('a single run with no retries is not enough data', () =>
  expect(one([{ tests: { t: ['pass'] } }]).label).toBe('insufficient'));

it('fewer than 3 attempts is not enough data', () =>
  expect(one([{ commit: 'a', tests: { t: ['pass'] } }, { commit: 'b', tests: { t: ['fail'] } }]).label).toBe('insufficient'));

it('all skipped is not enough data, never stable', () => {
  const s = one([{ tests: { t: ['skip'] } }, { tests: { t: ['skip'] } }, { tests: { t: ['skip'] } }]);
  expect(s.label).toBe('insufficient');
  expect(Number.isFinite(s.score)).toBe(true);
  expect(s.attempts).toBe(0);
});

it('always failing is failing', () => {
  const s = one(Array(4).fill({ tests: { t: ['fail', 'fail'] } }));
  expect(s.label).toBe('failing');
  expect(s.wasFlakyEarlier).toBe(false);
});

it('failing after flakiness keeps the note', () => {
  const s = one([{ commit: 'a', tests: { t: ['fail', 'pass'] } }, ...Array(10).fill({ commit: 'b', tests: { t: ['fail'] } })]);
  expect(s.label).toBe('failing');
  expect(s.wasFlakyEarlier).toBe(true);
});

it('mixed results across commits only is unproven', () => {
  // P P F F P P: 2 flips over 5 gaps (f = 0.4), every commit uniform (m = 0)
  const s = one(
    ['a', 'a', 'b', 'b', 'c', 'c'].map((commit, i) => ({
      commit,
      tests: { t: [(i === 2 || i === 3 ? 'fail' : 'pass') as 'pass' | 'fail'] },
    })),
  );
  expect(s.mixedCommits).toBe(0);
  expect(s.flipRate).toBeCloseTo(0.4);
  expect(s.label).toBe('suspect');
});

it('always passing over several runs is stable', () => expect(one(Array(5).fill({ tests: { t: ['pass'] } })).label).toBe('stable'));

it('wasted time counts only failed attempts in mixed commits', () => {
  const s = scoreTests(
    buildDataset([{ commit: 'a', tests: { t: ['fail', 'pass'] } }, { commit: 'b', tests: { t: ['fail'] } }], 60_000),
  )[0]!;
  expect(s.wastedMs).toBe(60_000);
  expect(s.possibleWastedMs).toBe(120_000);
  expect(s.durationUnknown).toBe(false);
});

it('unknown duration is flagged and counts as 0', () => {
  const s = scoreTests(buildDataset([{ tests: { t: ['fail', 'pass'] } }], null))[0]!;
  expect(s.durationUnknown).toBe(true);
  expect(s.wastedMs).toBe(0);
  expect(s.possibleWastedMs).toBe(0);
});

it('counts runs, retries and attempts without skips', () => {
  const s = one([{ tests: { t: ['fail', 'pass'] } }, { tests: { t: ['skip'] } }, { tests: { t: ['pass'] } }]);
  expect(s.attempts).toBe(3);
  expect(s.runs).toBe(2);
  expect(s.retries).toBe(1);
  expect(s.priority).toBe(0);
});

it('score matches the spec formula', () => {
  // one commit, F P: m = 1, g = 1, f = 1, r = ema([1,0]) = 0.7
  const s = one([{ tests: { t: ['fail', 'pass'] } }]);
  const z = 1.96, W = (1 + z * z / 2 - z * Math.sqrt(z * z / 4)) / (1 + z * z);
  expect(s.score).toBeCloseTo(100 * (0.6 * W + 0.25 * 1 + 0.15 * 4 * 0.7 * 0.3));
});

it('flags a new test that is already mixed', () => {
  const ds = buildDataset([{ tests: { old: ['pass'] } }, { tests: { old: ['pass'], fresh: ['fail', 'pass'] } }]);
  const byId = new Map(scoreTests(ds).map((s) => [s.testId, s]));
  expect(byId.get('fresh')!.isNew).toBe(true);
  expect(byId.get('fresh')!.firstSeenRunId).toBe('run1');
  expect(byId.get('fresh')!.lastFailedRunId).toBe('run1');
  expect(byId.get('old')!.isNew).toBe(false);
  expect(byId.get('old')!.lastFailedRunId).toBeNull();
});

it('score is within 0..100 for any history', () => {
  fc.assert(
    fc.property(
      fc.array(fc.array(fc.constantFrom('pass' as const, 'fail' as const, 'skip' as const), { minLength: 1, maxLength: 3 }), {
        maxLength: 30,
      }),
      (hist) =>
        scoreTests(buildDataset(hist.map((t) => ({ tests: { t } })))).every(
          (s) => Number.isFinite(s.score) && s.score >= 0 && s.score <= 100,
        ),
    ),
  );
});

it('input order of runs with timestamps does not change results', () => {
  const statuses = fc.constantFrom('pass' as const, 'fail' as const, 'skip' as const);
  const runArb = fc.record({
    commit: fc.constantFrom('a', 'b', 'c'),
    tests: fc.record({ t1: fc.array(statuses, { minLength: 1, maxLength: 3 }), t2: fc.array(statuses, { minLength: 1, maxLength: 3 }) }),
  });
  fc.assert(
    fc.property(fc.array(runArb, { minLength: 6, maxLength: 12 }), fc.integer(), (runs, seed) => {
      const ds = buildDataset(runs);
      ds.runs = ds.runs.map((r, i) => ({ ...r, startedAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() }));
      // Shuffle the arrays and the import order; only timestamps should decide history order.
      const shuffled = fc.sample(fc.shuffledSubarray(ds.runs, { minLength: ds.runs.length }), { seed, numRuns: 1 })[0]!;
      const reordered = {
        ...ds,
        runs: shuffled.map((r, i) => ({ ...r, order: i })),
        attempts: [...ds.attempts].reverse(),
      };
      const key = (d: typeof ds) =>
        scoreTests(d)
          .map((s) => `${s.testId}:${s.label}:${s.score}`)
          .sort();
      expect(key(reordered)).toEqual(key(ds));
    }),
  );
});

it('review I2: mixed timed and untimed runs give one order, whatever the array order', () => {
  // A (order 0, t=2), B (untimed, order 1), C (order 2, t=1): B follows A on import, C is earliest by time.
  const ds = buildDataset([{ tests: { t: ['fail'] } }, { tests: { t: ['fail'] } }, { tests: { t: ['pass'] } }]);
  ds.runs[0]!.startedAt = '2026-01-01T00:02:00.000Z';
  ds.runs[2]!.startedAt = '2026-01-01T00:01:00.000Z';
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const results = perms.map((p) => {
    const s = scoreTests({ ...ds, runs: p.map((i) => ds.runs[i]!) })[0]!;
    return [s.score, s.flipRate, s.firstSeenRunId, s.lastFailedRunId];
  });
  for (const r of results) expect(r).toEqual(results[0]);
  // C first (earliest time), then A, then B (inherits A's time, after A on import): P F F
  expect(results[0]![2]).toBe('run2');
  expect(results[0]![3]).toBe('run1');
});
