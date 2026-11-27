import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '@/engine/config';
import type { Attempt, Dataset, Failure, ImportRecord, Run, Test } from '@/engine/types';
import { causeOf, filterGroupCards, groupForTest, groupsView, sortGroupCards } from './groups';

interface F {
  run: number;
  test: string;
  message: string;
  retry?: number;
  stack?: string;
}
// Runs r0..r(n-1) from one file each ("run-0.json" ...), oldest first, with start times one day apart.
function build(fails: F[], runCount = 8): Dataset {
  const imports: ImportRecord[] = Array.from({ length: runCount }, (_, i) => ({
    importId: `i${i}`,
    fileName: `run-${i}.json`,
    importedAt: '2026-11-20T00:00:00.000Z',
    result: 'success',
    counts: { found: 1, imported: 1, notImported: 0 },
    notices: [],
    runIds: [`r${i}`],
  }));
  const runs: Run[] = Array.from({ length: runCount }, (_, i) => ({
    runId: `r${i}`,
    importId: `i${i}`,
    commit: `c${i}`,
    startedAt: `2026-11-${String(10 + i).padStart(2, '0')}T10:00:00.000Z`,
    order: i,
  }));
  const tests = new Map<string, Test>();
  const attempts: Attempt[] = [];
  const failures: Failure[] = [];
  fails.forEach((f, i) => {
    if (!tests.has(f.test)) tests.set(f.test, { testId: f.test, testKey: f.test, file: 'a.spec.ts', suitePath: ['checkout'], title: f.test, project: '' });
    attempts.push({ attemptId: `a${i}`, runId: `r${f.run}`, testId: f.test, repeatIndex: 0, retryIndex: f.retry ?? 0, status: 'fail', durationMs: 1000 });
    failures.push({ attemptId: `a${i}`, message: f.message, stack: f.stack ?? '' });
  });
  return { imports, runs, tests: [...tests.values()], attempts, failures };
}
const REFUSED = (n: number) => `page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:${40000 + n}/api/x${n}`;
const ENV = (n: number) => `Error: apiRequestContext.get: socket hang up (ECONNRESET)\nCall log: ${n}`;
const PLAIN = (n: number) => `Error: expect(received).toBe(expected) // Object.is equality\n\nExpected: ${n}\nReceived: ${n + 1}`;

const sample = () =>
  build([
    ...Array.from({ length: 6 }, (_, i) => ({ run: 5, test: `e${i}`, message: ENV(i) })), // an environment event in run 5
    ...Array.from({ length: 3 }, (_, i) => ({ run: 1 + i, test: `n${i}`, message: REFUSED(i) })),
    ...Array.from({ length: 2 }, (_, i) => ({ run: 7, test: `p${i}`, message: PLAIN(i) })),
    { run: 2, test: 'solo', message: 'Error: locator.click: strict mode violation: getByRole(\'button\') resolved to 2 elements' },
  ]);

describe('groupsView', () => {
  it('has one card per group with its tests, last seen and (for an event) the run and the test count', () => {
    const v = groupsView(sample());
    expect(v.cards).toHaveLength(4);
    const env = v.cards.find((c) => c.group.environmentEvent)!;
    expect(env.event).toEqual({ run: 'run-5.json', tests: 6 });
    expect(env.tests).toHaveLength(6);
    expect(env.tests[0]).toMatchObject({ title: 'checkout › e0' });
    const net = v.cards.find((c) => c.group.testIds.includes('n0'))!;
    expect(net.group.count).toBe(3);
    expect(net.lastSeen).toBe('2026-11-13T10:00:00.000Z'); // run 3
    expect(net.event).toBeNull();
  });

  it('is computed once per dataset', () => {
    const ds = sample();
    expect(groupsView(ds)).toBe(groupsView(ds));
    expect(groupsView(sample())).not.toBe(groupsView(ds));
  });

  it('an empty dataset has no cards', () => {
    expect(groupsView(build([])).cards).toEqual([]);
  });
});

describe('filter and sort', () => {
  const cards = groupsView(sample()).cards;
  const title = (c: (typeof cards)[number]) => c.tests.map((t) => t.testId).sort().join(',');

  it('search matches the template text, any case, and an empty search keeps everything', () => {
    expect(filterGroupCards(cards, '')).toBe(cards);
    expect(filterGroupCards(cards, '   ')).toBe(cards);
    expect(filterGroupCards(cards, 'econnreset').map(title)).toEqual(['e0,e1,e2,e3,e4,e5']);
    expect(filterGroupCards(cards, 'ERR_CONNECTION').map(title)).toEqual(['n0,n1,n2']);
    expect(filterGroupCards(cards, 'zzz-nothing')).toEqual([]);
    // the text of the masked template is searched, not the raw numbers
    expect(filterGroupCards(cards, '40001')).toEqual([]);
  });

  it('sorts environment events first, then by the chosen order', () => {
    const order = (s: 'failures' | 'tests' | 'latest') => sortGroupCards(cards, s).map((c) => (c.group.environmentEvent ? 'env' : title(c)));
    expect(order('failures')).toEqual(['env', 'n0,n1,n2', 'p0,p1', 'solo']);
    expect(order('tests')).toEqual(['env', 'n0,n1,n2', 'p0,p1', 'solo']);
    expect(order('latest')).toEqual(['env', 'p0,p1', 'n0,n1,n2', 'solo']); // last seen: run 7, run 3, run 2
  });

  it('does not change the input', () => {
    const before = cards.map((c) => c.group.fingerprint);
    sortGroupCards(cards, 'latest');
    expect(cards.map((c) => c.group.fingerprint)).toEqual(before);
  });
});

describe('cause of a group, and the group of a test', () => {
  it('classifies each group once and remembers it', () => {
    const ds = sample();
    const v = groupsView(ds);
    const net = v.cards.find((c) => c.group.testIds.includes('n0'))!.group;
    const a = causeOf(ds, net);
    expect(a.category).toBe('network');
    expect(causeOf(ds, net)).toBe(a);
    const env = v.cards.find((c) => c.group.environmentEvent)!.group;
    expect(causeOf(ds, env).category).toBe('infrastructure');
    const plain = v.cards.find((c) => c.group.testIds.includes('p0'))!.group;
    expect(causeOf(ds, plain)).toMatchObject({ category: 'unknown', confidence: 'low' });
  });

  it('finds the group holding the latest failure of a test, or null for a test that never failed', () => {
    const ds = sample();
    const g = groupForTest(ds, 'n1')!;
    expect(g.testIds).toContain('n1');
    expect(g.count).toBe(3);
    expect(groupForTest(ds, 'nobody')).toBeNull();
  });

  it('uses the config thresholds of the engine', () => {
    expect(DEFAULT_CONFIG.causeMinMatched).toBe(0.5);
  });
});
