import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../config';
import type { Attempt, Dataset, Failure, Run, Test } from '../types';
import { groupFailures } from './group';

// Builds a dataset where each entry says: in run `run`, test `test` failed with `message` (on attempt `retry`).
interface Fail {
  run: number;
  test: string;
  message: string;
  retry?: number;
  stack?: string;
}
function build(fails: Fail[], runCount = 12): Dataset {
  const runs: Run[] = Array.from({ length: runCount }, (_, i) => ({ runId: `r${i}`, importId: 'imp', commit: `c${Math.floor(i / 2)}`, startedAt: null, order: i }));
  const tests = new Map<string, Test>();
  const attempts: Attempt[] = [];
  const failures: Failure[] = [];
  fails.forEach((f, i) => {
    if (!tests.has(f.test)) tests.set(f.test, { testId: f.test, testKey: f.test, file: 'a.spec.ts', suitePath: [], title: f.test, project: '' });
    const attemptId = `a${i}`;
    attempts.push({ attemptId, runId: `r${f.run}`, testId: f.test, repeatIndex: 0, retryIndex: f.retry ?? 0, status: 'fail', durationMs: 1000 });
    failures.push({ attemptId, message: f.message, stack: f.stack ?? '' });
  });
  return { imports: [], runs, tests: [...tests.values()], attempts, failures };
}
const msg = (n: number) => `page.goto: net::ERR_CONNECTION_RESET at http://127.0.0.1:${50000 + n}/path${n}?x=${n}\nCall log: navigating after ${n * 31} ms`;

describe('groupFailures', () => {
  it('puts failures with the same normalised message in one group, with counts, tests, runs and first and last run', () => {
    const ds = build([
      { run: 4, test: 't1', message: msg(1) },
      { run: 2, test: 't2', message: msg(2) },
      { run: 9, test: 't1', message: msg(3) },
      { run: 2, test: 't3', message: 'Error: something else entirely happened here today' },
    ]);
    const groups = groupFailures(ds, DEFAULT_CONFIG);
    expect(groups).toHaveLength(2);
    const g = groups[0]!;
    expect(g.count).toBe(3);
    expect(g.testIds.sort()).toEqual(['t1', 't2']);
    expect(g.runIds.sort()).toEqual(['r2', 'r4', 'r9']);
    expect(g.firstRunId).toBe('r2');
    expect(g.lastRunId).toBe('r9');
    expect(g.environmentEvent).toBe(false);
    expect(g.fingerprint).toMatch(/^[0-9a-f]{14}$/);
    expect(g.template).toContain('net::ERR_CONNECTION_RESET');
    expect(groups[1]!.count).toBe(1);
  });

  it('sorts by count, biggest first, with a stable order for ties', () => {
    const fails: Fail[] = [];
    for (let i = 0; i < 3; i++) fails.push({ run: i, test: `a${i}`, message: 'alpha alpha failure about the widget in the first area' });
    for (let i = 0; i < 5; i++) fails.push({ run: i, test: `b${i}`, message: 'beta beta failure with a different wording over here now' });
    for (let i = 0; i < 3; i++) fails.push({ run: i, test: `c${i}`, message: 'gamma gamma problem with something unrelated at all really' });
    const counts = groupFailures(build(fails), DEFAULT_CONFIG).map((g) => g.count);
    expect(counts).toEqual([5, 3, 3]);
    const again = groupFailures(build(fails), DEFAULT_CONFIG).map((g) => g.fingerprint);
    expect(again).toEqual(groupFailures(build([...fails].reverse()), DEFAULT_CONFIG).map((g) => g.fingerprint));
  });

  it('merges near-duplicates at Jaccard >= groupMergeJaccard and keeps distinct messages apart', () => {
    const words = Array.from({ length: 30 }, (_, i) => `w${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(110 + (i % 12))}`);
    const base = words.join(' ');
    const oneChanged = [...words.slice(0, 14), 'different', ...words.slice(15)].join(' '); // 1 of 30 words: Jaccard about 0.87
    const fourChanged = [...words.slice(0, 5), 'x1', ...words.slice(6, 12), 'x2', ...words.slice(13, 20), 'x3', ...words.slice(21, 26), 'x4', ...words.slice(27)].join(' ');
    const ds = build([
      { run: 0, test: 't1', message: base },
      { run: 0, test: 't2', message: oneChanged },
      { run: 0, test: 't3', message: fourChanged },
    ]);
    const merged = groupFailures(ds, DEFAULT_CONFIG);
    expect(merged.map((g) => g.count).sort()).toEqual([1, 2]);
    expect(merged.find((g) => g.count === 2)!.testIds.sort()).toEqual(['t1', 't2']);
    // a looser threshold merges the third too; a threshold of 1 merges nothing
    expect(groupFailures(ds, { ...DEFAULT_CONFIG, groupMergeJaccard: 0.5 })).toHaveLength(1);
    expect(groupFailures(ds, { ...DEFAULT_CONFIG, groupMergeJaccard: 1 })).toHaveLength(3);
  });

  it('merging chains through union-find: A~B and B~C put all three together', () => {
    const w = (i: number) => `tok${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + ((i * 5) % 26))}${String.fromCharCode(97 + ((i * 11) % 26))}`;
    const a = Array.from({ length: 40 }, (_, i) => w(i));
    const b = [...a.slice(0, 10), 'chg1', ...a.slice(11)];
    const c = [...b.slice(0, 30), 'chg2', ...b.slice(31)];
    const ds = build([a, b, c].map((m, i) => ({ run: 0, test: `t${i}`, message: m.join(' ') })));
    expect(groupFailures(ds, DEFAULT_CONFIG)).toHaveLength(1);
  });

  it('flags an environment event: at least envEventMinTests distinct tests with one fingerprint in one run', () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ run: 6, test: `t${i}`, message: msg(i) }));
    expect(groupFailures(build(five), DEFAULT_CONFIG)[0]!.environmentEvent).toBe(true);
    expect(groupFailures(build(five.slice(0, 4)), DEFAULT_CONFIG)[0]!.environmentEvent).toBe(false);
    // five tests but in five different runs: not an event
    const spread = Array.from({ length: 5 }, (_, i) => ({ run: i, test: `t${i}`, message: msg(i) }));
    expect(groupFailures(build(spread), DEFAULT_CONFIG)[0]!.environmentEvent).toBe(false);
    // one test failing five times (retries) is one test
    const same = Array.from({ length: 5 }, (_, i) => ({ run: 6, test: 't0', message: msg(i), retry: i }));
    expect(groupFailures(build(same), DEFAULT_CONFIG)[0]!.environmentEvent).toBe(false);
    // the threshold comes from the config
    expect(groupFailures(build(five.slice(0, 3)), { ...DEFAULT_CONFIG, envEventMinTests: 3 })[0]!.environmentEvent).toBe(true);
    expect(groupFailures(build(five), { ...DEFAULT_CONFIG, envEventMinTests: 6 })[0]!.environmentEvent).toBe(false);
  });

  it('ignores a failure whose attempt is missing, and uses the first stack line when a failure has no message', () => {
    const ds = build([{ run: 0, test: 't1', message: '', stack: 'Error: boom in the stack\n    at x (/repo/a.ts:1:1)' }]);
    ds.failures.push({ attemptId: 'ghost', message: 'orphan', stack: '' });
    const groups = groupFailures(ds, DEFAULT_CONFIG);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.template).toContain('Error: boom in the stack');
  });

  it('an empty dataset gives no groups', () => {
    expect(groupFailures(build([]), DEFAULT_CONFIG)).toEqual([]);
  });
});

describe('timing', () => {
  const time = (f: () => void) => {
    const t0 = performance.now();
    f();
    return performance.now() - t0;
  };

  it('groups 5,000 tests x 50 runs (a tenth of them failing) in under 2 s', () => {
    const runs: Run[] = Array.from({ length: 50 }, (_, i) => ({ runId: `r${i}`, importId: 'i', commit: `c${i}`, startedAt: null, order: i }));
    const tests: Test[] = Array.from({ length: 5000 }, (_, i) => ({ testId: `t${i}`, testKey: `t${i}`, file: `f${i % 50}.spec.ts`, suitePath: [], title: `test ${i}`, project: '' }));
    const attempts: Attempt[] = [];
    const failures: Failure[] = [];
    const templates = [
      (k: number) => `expect(locator).toBeVisible() failed\nLocator: #item-${k}\nTimeout: 5000ms\nCall log: waiting for locator, ${k} elements found`,
      (k: number) => `page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:${40000 + k}/api/v${k}?id=${k}`,
      (k: number) => `Error: expect(received).toBe(expected) // Object.is equality\n\nExpected: ${k}\nReceived: ${k + 1}`,
      (k: number) => `Test timeout of 30000ms exceeded while running "beforeEach" hook at /repo/tests/f${k}.spec.ts:${k}:7`,
    ];
    let id = 0;
    for (const run of runs)
      for (const test of tests) {
        const failing = (id + 3) % 10 === 0;
        const attemptId = `a${id++}`;
        attempts.push({ attemptId, runId: run.runId, testId: test.testId, repeatIndex: 0, retryIndex: 0, status: failing ? 'fail' : 'pass', durationMs: 10 });
        if (failing) failures.push({ attemptId, message: templates[id % templates.length]!(id), stack: '' });
      }
    const ds: Dataset = { imports: [], runs, tests, attempts, failures };
    expect(attempts).toHaveLength(250_000);
    let groups: ReturnType<typeof groupFailures> = [];
    const ms = time(() => (groups = groupFailures(ds, DEFAULT_CONFIG)));
    console.log(`groupFailures: 5,000 tests x 50 runs, ${failures.length} failures -> ${groups.length} groups in ${Math.round(ms)} ms`);
    expect(groups.length).toBeLessThanOrEqual(templates.length);
    expect(ms).toBeLessThan(2000);
  });

  it('20,000 failures with distinct messages group in under 2 s (the near-duplicate search does not go quadratic)', () => {
    const ds = build(
      Array.from({ length: 20_000 }, (_, i) => ({
        run: i % 12,
        test: `t${i}`,
        message: `unique${i.toString(36)} word${(i * 7).toString(36)} text${(i * 13).toString(36)} about${(i * 17).toString(36)} step${(i * 19).toString(36)} thing${(i * 23).toString(36)}`,
      })),
    );
    let count = 0;
    const ms = time(() => (count = groupFailures(ds, DEFAULT_CONFIG).length));
    console.log(`groupFailures: 20,000 distinct messages -> ${count} groups in ${Math.round(ms)} ms`);
    expect(ms).toBeLessThan(2000);
  });

  it('many near-identical long messages (one big merge) stay fast', () => {
    const base = Array.from({ length: 60 }, (_, i) => `part${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + ((i * 3) % 26))}`);
    const ds = build(Array.from({ length: 5_000 }, (_, i) => ({ run: i % 12, test: `t${i}`, message: [...base.slice(0, i % 60), `v${i}x${i % 7}y`, ...base.slice((i % 60) + 1)].join(' ') })));
    const ms = time(() => groupFailures(ds, DEFAULT_CONFIG));
    console.log(`groupFailures: 5,000 near-duplicates -> ${Math.round(ms)} ms`);
    expect(ms).toBeLessThan(2000);
  });
});
