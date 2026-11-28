import { it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../config';
import type { AttemptStatus, Dataset, Run } from '../types';
import { correlate, correlateAll, createCorrelator, strengthOf } from './correlate';
import { fisherExact, oddsRatio } from './stats';

type RunSpec = Partial<Pick<Run, 'browser' | 'shard' | 'os' | 'startedAt'>>;
type TestSpec = { id: string; project?: string; key?: string; runs: AttemptStatus[][] }; // runs[i] = the attempts of this test in run i

// Test-only builder: run i has the metadata of runs[i]; each test lists its attempts per run (retry order).
function build(runs: RunSpec[], tests: TestSpec[]): Dataset {
  const ds: Dataset = { imports: [], runs: [], tests: [], attempts: [], failures: [] };
  runs.forEach((r, i) => ds.runs.push({ runId: `r${i}`, importId: 'imp', commit: null, startedAt: null, order: i, ...r }));
  for (const t of tests) {
    ds.tests.push({ testId: t.id, testKey: t.key ?? t.id, file: 'a.spec.ts', suitePath: [], title: t.id, project: t.project ?? '' });
    t.runs.forEach((statuses, i) =>
      statuses.forEach((status, retryIndex) => ds.attempts.push({ attemptId: `${t.id}:${i}:${retryIndex}`, runId: `r${i}`, testId: t.id, repeatIndex: 0, retryIndex, status, durationMs: 1 })),
    );
  }
  return ds;
}

const P: AttemptStatus[] = ['pass'];
const F: AttemptStatus[] = ['fail'];
const dim = (ds: Dataset, id: string, name: string) => correlate(ds, id).find((r) => r.dimension === name)!;
// 10 runs on chromium and 10 on firefox; the test fails `cr` times on chromium and `ff` times on firefox
const browsers = (cr: number, ff: number) => {
  const runs: RunSpec[] = [...Array(10).fill({ browser: 'chromium' }), ...Array(10).fill({ browser: 'firefox' })];
  const seq = [...Array.from({ length: 10 }, (_, i) => (i < cr ? F : P)), ...Array.from({ length: 10 }, (_, i) => (i < ff ? F : P))];
  return build(runs, [{ id: 't', runs: seq }]);
};

it('returns the five dimensions in a fixed order, and a test that is not in the data is missing everywhere', () => {
  const out = correlate(browsers(1, 9), 't');
  expect(out.map((r) => r.dimension)).toEqual(['browser', 'shard', 'os', 'hour', 'project']);
  const none = correlate(browsers(1, 9), 'nope');
  expect(none.map((r) => r.status)).toEqual(['missing', 'missing', 'missing', 'missing', 'missing']);
});

it('browser: a test that fails on firefox and not on chromium is a finding with the numbers the screen prints', () => {
  const r = dim(browsers(1, 9), 't', 'browser');
  expect(r.status).toBe('finding');
  expect(r.strength).toBe('Strong');
  expect(r.highlightedValue).toBe('firefox');
  expect(r.values).toEqual([
    { value: 'chromium', failed: 1, attempts: 10, rate: 0.1 },
    { value: 'firefox', failed: 9, attempts: 10, rate: 0.9 },
  ]);
  expect(r.others).toEqual({ failed: 1, attempts: 10, rate: 0.1 });
  expect(r.pointsHigher).toBeCloseTo(80, 9); // percentage points
  expect(r.oddsRatio).toBeCloseTo(oddsRatio(9, 1, 1, 9), 12);
  expect(r.comparisons).toBe(1);
  expect(r.adjustedP).toBeCloseTo(fisherExact(9, 1, 1, 9), 12);
});

it('a dimension the files do not have is missing, with its name; a single value is missing too', () => {
  const ds = browsers(1, 9);
  for (const name of ['shard', 'os', 'hour', 'project']) {
    const r = dim(ds, 't', name);
    expect(r).toMatchObject({ dimension: name, status: 'missing', values: [], comparisons: 1 });
    expect(r.highlightedValue).toBeUndefined();
    expect(r.strength).toBeUndefined();
  }
  const oneBrowser = build(Array(12).fill({ browser: 'chromium' }), [{ id: 't', runs: Array(12).fill(F) }]);
  expect(dim(oneBrowser, 't', 'browser').status).toBe('missing');
});

it('uniform failure is not a link: same rate everywhere', () => {
  const r = dim(browsers(5, 5), 't', 'browser');
  expect(r.status).toBe('none');
  expect(r.strength).toBeUndefined();
  expect(r.pointsHigher).toBe(0);
  expect(r.adjustedP).toBeCloseTo(1, 9);
  expect(dim(browsers(10, 10), 't', 'browser').status).toBe('none');
});

it('the value that fails more is the one highlighted, whichever it is', () => {
  const r = dim(browsers(9, 1), 't', 'browser'); // chromium is the bad one now
  expect(r.status).toBe('finding');
  expect(r.highlightedValue).toBe('chromium');
});

it('not enough data: below the thresholds the result is never a finding, and the reason carries the numbers', () => {
  const small = build([{ browser: 'a' }, { browser: 'a' }, { browser: 'b' }, { browser: 'b' }, { browser: 'b' }], [{ id: 't', runs: [F, F, P, P, P] }]);
  const r = dim(small, 't', 'browser');
  expect(r.status).toBe('notEnough');
  expect(r.strength).toBeUndefined();
  expect(r.reason).toEqual({ minAttempts: 10, minFails: 3, minGroup: 3, attempts: 5, fails: 2, smallestGroup: 2 });
  expect(r.values).toHaveLength(2); // the screen can still show what was seen
  // enough attempts and fails, but one group has 2 attempts
  const ds = build([...Array(18).fill({ browser: 'a' }), { browser: 'b' }, { browser: 'b' }], [{ id: 't', runs: Array(20).fill(F) }]);
  expect(dim(ds, 't', 'browser').reason).toMatchObject({ attempts: 20, fails: 20, smallestGroup: 2 });
  expect(dim(ds, 't', 'browser').status).toBe('notEnough');
  // too few failures
  const fewFails = build(Array.from({ length: 12 }, (_, i) => ({ browser: i < 6 ? 'a' : 'b' })), [{ id: 't', runs: [F, F, ...Array(10).fill(P)] }]);
  expect(dim(fewFails, 't', 'browser').reason).toMatchObject({ fails: 2 });
  expect(dim(fewFails, 't', 'browser').status).toBe('notEnough');
});

it('thresholds come from the config', () => {
  const ds = browsers(1, 9);
  expect(dim(ds, 't', 'browser').status).toBe('finding');
  const strict = correlate(ds, 't', { ...DEFAULT_CONFIG, corrMinAttempts: 21 }).find((r) => r.dimension === 'browser')!;
  expect(strict.status).toBe('notEnough');
  expect(strict.reason!.minAttempts).toBe(21);
});

it('skipped attempts are not counted', () => {
  const ds = build(
    [...Array(10).fill({ browser: 'a' }), ...Array(10).fill({ browser: 'b' })],
    [{ id: 't', runs: [...Array(10).fill(P), ...Array.from({ length: 10 }, (_, i): AttemptStatus[] => (i < 9 ? F : ['skip']))] }],
  );
  expect(dim(ds, 't', 'browser').values.find((v) => v.value === 'b')).toMatchObject({ failed: 9, attempts: 9 });
});

it('retries count as attempts: a failed run that passes on retry is one fail and one pass', () => {
  const runs = [...Array(10).fill({ browser: 'a' }), ...Array(10).fill({ browser: 'b' })];
  const ds = build(runs, [{ id: 't', runs: [...Array(10).fill(P), ...Array(10).fill(['fail', 'pass'])] }]);
  expect(dim(ds, 't', 'browser').values.find((v) => v.value === 'b')).toMatchObject({ failed: 10, attempts: 20 });
});

it('strength: label from the adjusted p and the difference, with the config thresholds', () => {
  const c = DEFAULT_CONFIG;
  expect(strengthOf(0.009, 0.3, c)).toBe('Strong');
  expect(strengthOf(0.01, 0.9, c)).toBe('Moderate'); // not below 0.01
  expect(strengthOf(0.009, 0.29, c)).toBe('Moderate');
  expect(strengthOf(0.049, 0.2, c)).toBe('Moderate');
  expect(strengthOf(0.049, 0.19, c)).toBe('Weak');
  expect(strengthOf(0.099, 0.05, c)).toBe('Weak');
  expect(strengthOf(0.1, 0.9, c)).toBeNull();
  expect(strengthOf(0.001, 0, c)).toBe('Weak'); // a tiny p with a tiny difference is still only Weak
  expect(strengthOf(0.001, 0.3, { ...c, corrStrongDiff: 0.4 })).toBe('Moderate');
});

it('Bonferroni: the p is multiplied by the number of dimensions tested, and capped at 1', () => {
  const runs: RunSpec[] = Array.from({ length: 20 }, (_, i) => ({ browser: i < 10 ? 'chromium' : 'firefox', os: i < 10 ? 'linux' : 'mac' }));
  const seq = Array.from({ length: 20 }, (_, i) => (i === 0 || i >= 11 ? F : P)); // 1 of 10 against 9 of 10 on both dimensions
  const out = correlate(build(runs, [{ id: 't', runs: seq }]), 't');
  const raw = fisherExact(9, 1, 1, 9);
  for (const name of ['browser', 'os']) {
    const r = out.find((x) => x.dimension === name)!;
    expect(r.comparisons).toBe(2);
    expect(r.adjustedP).toBeCloseTo(Math.min(1, raw * 2), 12);
  }
  expect(out.find((x) => x.dimension === 'shard')!.comparisons).toBe(2); // every result carries the number of comparisons
  const flat = build(runs, [{ id: 't', runs: Array.from({ length: 20 }, (_, i) => (i % 2 ? F : P)) }]);
  for (const r of correlate(flat, 't')) expect(r.adjustedP).toBeLessThanOrEqual(1);
});

it('shard values read "1 of 2"; a run without shard info is left out of that dimension', () => {
  const runs: RunSpec[] = [...Array(10).fill({ shard: { current: 1, total: 2 } }), ...Array(10).fill({ shard: { current: 2, total: 2 } }), {}];
  const seq = [...Array(10).fill(P), ...Array(10).fill(F), F];
  const r = dim(build(runs, [{ id: 't', runs: seq }]), 't', 'shard');
  expect(r.values.map((v) => v.value)).toEqual(['1 of 2', '2 of 2']);
  expect(r.highlightedValue).toBe('2 of 2');
  expect(r.status).toBe('finding');
  expect(r.values.reduce((n, v) => n + v.attempts, 0)).toBe(20);
});

it('hour: the UTC hour of the run start; a run with no usable start time is left out', () => {
  const at = (h: number, d: number) => `2026-11-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:30:00.000Z`;
  const runs: RunSpec[] = [
    ...Array.from({ length: 10 }, (_, i) => ({ startedAt: at(3, i + 1) })),
    ...Array.from({ length: 10 }, (_, i) => ({ startedAt: at(14, i + 11) })),
    { startedAt: 'not a date' },
    { startedAt: null },
  ];
  const seq = [...Array(10).fill(P), ...Array(10).fill(F), F, F];
  const r = dim(build(runs, [{ id: 't', runs: seq }]), 't', 'hour');
  expect(r.values.map((v) => v.value)).toEqual(['03', '14']);
  expect(r.highlightedValue).toBe('14');
  expect(r.status).toBe('finding');
});

const shards3 = (fails: [number, number, number], n: number) => {
  const runs: RunSpec[] = [];
  const seq: AttemptStatus[][] = [];
  fails.forEach((f, s) => {
    for (let i = 0; i < n; i++) {
      runs.push({ shard: { current: s + 1, total: 3 } });
      seq.push(i < f ? F : P);
    }
  });
  return build(runs, [{ id: 't', runs: seq }]);
};
const threeBrowsers = (fails: [number, number, number], runs: [number, number, number]) => {
  const names = ['webkit', 'chromium', 'firefox'];
  const specs: RunSpec[] = [];
  const seq: AttemptStatus[][] = [];
  fails.forEach((f, b) => {
    for (let i = 0; i < runs[b]!; i++) {
      specs.push({ browser: names[b] });
      seq.push(i < f ? F : P);
    }
  });
  return build(specs, [{ id: 't', runs: seq }]);
};

it('three or more values: chi-square decides when every expected count is at least 5', () => {
  const big = dim(shards3([2, 4, 18], 20), 't', 'shard'); // expected counts all >= 5
  expect(big.status).toBe('finding');
  expect(big.highlightedValue).toBe('3 of 3');
  expect(big.strength).toBe('Strong');
  expect(big.method).toBe('chiSquare');
  expect(big.others).toEqual({ failed: 6, attempts: 40, rate: 0.15 });
});

// DEV-40 follow-up: with 3+ values and a chi-square that is not valid, the highest-rate value is tested against the rest with
// Fisher, and the p is multiplied by the number of values (capped at 1).
it('3 values, chi-square not valid: the best value against the rest, times the number of values', () => {
  const r = dim(threeBrowsers([8, 0, 0], [16, 8, 8]), 't', 'browser'); // webkit 8 of 16, chromium 0 of 8, firefox 0 of 8
  expect(r.status).toBe('finding');
  expect(r.highlightedValue).toBe('webkit');
  expect(r.method).toBe('fisherBest');
  expect(r.adjustedP).toBeCloseTo(Math.min(1, fisherExact(8, 8, 0, 16) * 3), 12);
  expect(r.others).toEqual({ failed: 0, attempts: 16, rate: 0 });
  expect(r.strength).toBe('Strong');
  const small = dim(shards3([0, 0, 4], 4), 't', 'shard'); // 4 of 4 against 0 of 8
  expect(small.status).toBe('finding');
  expect(small.adjustedP).toBeCloseTo(Math.min(1, fisherExact(4, 0, 0, 8) * 3), 12);
});

it('3 values with the same rate everywhere stays none', () => {
  expect(dim(threeBrowsers([5, 5, 5], [10, 10, 10]), 't', 'browser').status).toBe('none');
  expect(dim(threeBrowsers([2, 2, 2], [4, 4, 4]), 't', 'browser').status).toBe('none'); // too sparse for chi-square, still equal
});

it('sparse 24-hour data does not make a false finding', () => {
  const at = (h: number, d: number) => `2026-11-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:10:00.000Z`;
  const runs: RunSpec[] = [];
  const seq: AttemptStatus[][] = [];
  for (let h = 0; h < 24; h++) {
    for (let d = 1; d <= 3; d++) {
      runs.push({ startedAt: at(h, d) });
      seq.push((h * 5 + d * 3) % 7 < 2 ? F : P); // about a third fail, scattered
    }
  }
  const r = dim(build(runs, [{ id: 't', runs: seq }]), 't', 'hour');
  expect(r.values).toHaveLength(24);
  expect(r.status).not.toBe('finding');
});

it('two values are unchanged: Fisher, method fisher', () => {
  expect(dim(browsers(1, 9), 't', 'browser').method).toBe('fisher');
});

it('project: sibling tests with the same testKey are compared by project; a test with no sibling is missing', () => {
  const siblings = build(Array(10).fill({}), [
    { id: 'desk', key: 'k1', project: 'chromium', runs: Array(10).fill(P) },
    { id: 'mob', key: 'k1', project: 'chromium-mobile', runs: Array(10).fill(F) },
    { id: 'other', key: 'k2', project: 'chromium', runs: Array(10).fill(F) },
  ]);
  for (const id of ['desk', 'mob']) {
    const r = dim(siblings, id, 'project');
    expect(r.status).toBe('finding');
    expect(r.strength).toBe('Strong');
    expect(r.highlightedValue).toBe('chromium-mobile');
    expect(r.values).toEqual([
      { value: 'chromium', failed: 0, attempts: 10, rate: 0 },
      { value: 'chromium-mobile', failed: 10, attempts: 10, rate: 1 },
    ]);
  }
  expect(dim(siblings, 'other', 'project').status).toBe('missing'); // another testKey is not mixed in
  expect(dim(browsers(1, 9), 't', 'project').status).toBe('missing');
});

it('os is read from the runs when a project sets it', () => {
  const runs: RunSpec[] = [...Array(10).fill({ os: 'linux' }), ...Array(10).fill({ os: 'windows' })];
  const r = dim(build(runs, [{ id: 't', runs: [...Array(10).fill(P), ...Array(10).fill(F)] }]), 't', 'os');
  expect(r.highlightedValue).toBe('windows');
});

it('correlateAll gives the same result as correlate for each test, and the data is not changed', () => {
  const ds = build(
    [...Array(10).fill({ browser: 'a' }), ...Array(10).fill({ browser: 'b' })],
    [
      { id: 't1', runs: [...Array(10).fill(P), ...Array(10).fill(F)] },
      { id: 't2', runs: Array(20).fill(P) },
    ],
  );
  const before = JSON.stringify(ds);
  const all = correlateAll(ds);
  expect([...all.keys()]).toEqual(['t1', 't2']);
  for (const id of ['t1', 't2']) expect(all.get(id)).toEqual(correlate(ds, id));
  expect(createCorrelator(ds)('t1')).toEqual(correlate(ds, 't1'));
  expect(JSON.stringify(ds)).toBe(before);
});

it('timing: 5,000 tests x 50 runs are correlated in under 2 seconds, eagerly', () => {
  const runs: RunSpec[] = Array.from({ length: 50 }, (_, i) => ({
    browser: i % 2 ? 'chromium' : 'firefox',
    shard: { current: (i % 3) + 1, total: 3 },
    os: i % 5 ? 'linux' : 'mac',
    startedAt: new Date(Date.UTC(2026, 10, 1, i % 24, 0, 0)).toISOString(),
  }));
  const tests: TestSpec[] = Array.from({ length: 5000 }, (_, t) => ({
    id: `t${t}`,
    key: `k${t % 2500}`, // every test has a sibling in another project
    project: t < 2500 ? 'chromium' : 'chromium-mobile',
    runs: Array.from({ length: 50 }, (_, i): AttemptStatus[] => ((t * 7 + i * 13) % 11 === 0 ? ['fail', 'pass'] : P)),
  }));
  const ds = build(runs, tests);
  const t0 = performance.now();
  const all = correlateAll(ds);
  const ms = performance.now() - t0;
  expect(all.size).toBe(5000);
  expect(ms).toBeLessThan(2000);
});

it('project is symmetric: either sibling gets the same project table and result', () => {
  const ds = build(Array.from({ length: 12 }, (_, i) => ({ browser: i % 2 ? 'a' : 'b' })), [
    { id: 'desk', key: 'k', project: 'chromium', runs: Array.from({ length: 12 }, (_, i) => (i < 2 ? F : P)) },
    { id: 'mob', key: 'k', project: 'phone', runs: Array.from({ length: 12 }, (_, i) => (i < 9 ? F : P)) },
  ]);
  // the table and effect are the same; the adjusted p can differ because each test has its own number of tested dimensions
  const pick = ({ status, values, others, highlightedValue, pointsHigher, oddsRatio }: ReturnType<typeof dim>) => ({ status, values, others, highlightedValue, pointsHigher, oddsRatio });
  expect(pick(dim(ds, 'desk', 'project'))).toEqual(pick(dim(ds, 'mob', 'project')));
  expect(dim(ds, 'desk', 'project').values).toEqual(dim(ds, 'mob', 'project').values);
  expect(dim(ds, 'desk', 'project').highlightedValue).toBe('phone');
});

it('Bonferroni counts project only when it is tested, not when it is missing', () => {
  const runs: RunSpec[] = Array.from({ length: 20 }, (_, i) => ({ browser: i < 10 ? 'a' : 'b' }));
  const seq = Array.from({ length: 20 }, (_, i): AttemptStatus[] => (i >= 10 ? F : P));
  const alone = build(runs, [{ id: 't', key: 'k', project: 'p1', runs: seq }]);
  expect(dim(alone, 't', 'browser').comparisons).toBe(1); // project missing: not counted
  const withSibling = build(runs, [
    { id: 't', key: 'k', project: 'p1', runs: seq },
    { id: 's', key: 'k', project: 'p2', runs: Array(20).fill(P) },
  ]);
  expect(dim(withSibling, 't', 'browser').comparisons).toBe(2); // project tested: counted
});
