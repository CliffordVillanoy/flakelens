import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../config';
import type { Attempt, Dataset, Failure, Run, Test } from '../types';
import { groupFailures } from '../group/group';
import { classifyGroup } from './group';

interface F {
  run: number;
  test: string;
  message: string;
  stack?: string;
}
function build(fails: F[], runCount = 12): Dataset {
  const runs: Run[] = Array.from({ length: runCount }, (_, i) => ({ runId: `r${i}`, importId: 'imp', commit: `c${Math.floor(i / 2)}`, startedAt: null, order: i }));
  const tests = new Map<string, Test>();
  const attempts: Attempt[] = [];
  const failures: Failure[] = [];
  fails.forEach((f, i) => {
    if (!tests.has(f.test)) tests.set(f.test, { testId: f.test, testKey: f.test, file: 'a.spec.ts', suitePath: [], title: f.test, project: '' });
    attempts.push({ attemptId: `a${i}`, runId: `r${f.run}`, testId: f.test, repeatIndex: 0, retryIndex: 0, status: 'fail', durationMs: 1000 });
    failures.push({ attemptId: `a${i}`, message: f.message, stack: f.stack ?? '' });
  });
  return { imports: [], runs, tests: [...tests.values()], attempts, failures };
}
const STRICT = "locator.click: Error: strict mode violation: getByRole('button') resolved to 2 elements";
const REFUSED = 'page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:1/api';
const PLAIN = 'Error: expect(received).toBe(expected) // Object.is equality\n\nExpected: 0\nReceived: 1';
// Messages that read the same once masked are one group, as DEV-36 makes them; `n` varies the number.
const classify = (fails: F[], config = DEFAULT_CONFIG) => {
  const ds = build(fails);
  const groups = groupFailures(ds, config);
  return { ds, groups, results: groups.map((g) => classifyGroup(g, ds, config)) };
};

describe('classifyGroup', () => {
  it('a group of failures that all match one rule: that category, agreement 1, high confidence for a strong rule', () => {
    const { groups, results, ds } = classify(Array.from({ length: 6 }, (_, i) => ({ run: i, test: `t${i}`, message: STRICT })));
    expect(groups).toHaveLength(1);
    const r = results[0]!;
    expect(r.category).toBe('locator');
    expect(r.agreement).toBe(1);
    expect(r.confidence).toBe('high');
    expect(r.evidence[0]).toMatchObject({ line: 1 });
    expect(r.evidence[0]!.text).toContain('strict mode violation');
    // the representative is the latest failure that matched (run 5)
    const att = ds.attempts.find((a) => a.attemptId === r.attemptId)!;
    expect(att.runId).toBe('r5');
  });

  it('a medium-weight winning rule never gives high, even at full agreement', () => {
    const { results } = classify(Array.from({ length: 5 }, (_, i) => ({ run: i, test: `t${i}`, message: `Error: socket hang up (ECONNRESET) ${i}` })));
    expect(results[0]!.category).toBe('network');
    expect(results[0]!.agreement).toBe(1);
    expect(results[0]!.confidence).toBe('medium');
  });

  it('no rule fires: unknown, low, no evidence, and a representative attempt anyway', () => {
    const { results } = classify([{ run: 0, test: 't0', message: PLAIN }]);
    expect(results[0]).toMatchObject({ category: 'unknown', confidence: 'low', evidence: [], agreement: 1 });
    expect(results[0]!.attemptId).toBe('a0');
  });

  it('is the majority of the sampled failures; agreement is its share; confidence follows the config thresholds', () => {
    // 8 x strict, 2 x refused in one merged group (identical after masking is not needed: use the same raw text per kind)
    const fails: F[] = [
      ...Array.from({ length: 8 }, (_, i) => ({ run: i, test: `s${i}`, message: STRICT })),
      ...Array.from({ length: 2 }, (_, i) => ({ run: 8 + i, test: `n${i}`, message: REFUSED })),
    ];
    const ds = build(fails);
    // classify all ten as one group by building the group by hand
    const g = { ...groupFailures(ds, DEFAULT_CONFIG)[0]!, attemptIds: ds.failures.map((f) => f.attemptId) };
    const r = classifyGroup(g, ds, DEFAULT_CONFIG);
    expect(r.category).toBe('locator');
    expect(r.agreement).toBeCloseTo(0.8);
    expect(r.confidence).toBe('high'); // >= 0.8 and a high-weight rule
    expect(classifyGroup(g, ds, { ...DEFAULT_CONFIG, causeHighAgreement: 0.9 }).confidence).toBe('medium');
    expect(classifyGroup(g, ds, { ...DEFAULT_CONFIG, causeHighAgreement: 0.9, causeMediumAgreement: 0.9 }).confidence).toBe('low');
  });

  it('samples at most causeSampleSize failures, the latest ones', () => {
    const fails: F[] = [
      ...Array.from({ length: 10 }, (_, i) => ({ run: 0, test: `old${i}`, message: PLAIN })), // oldest run: unknown
      ...Array.from({ length: 20 }, (_, i) => ({ run: 5 + (i % 6), test: `new${i}`, message: REFUSED })),
    ];
    const ds = build(fails);
    const g = { ...groupFailures(ds, DEFAULT_CONFIG)[0]!, attemptIds: ds.failures.map((f) => f.attemptId) };
    const r = classifyGroup(g, ds, DEFAULT_CONFIG);
    expect(r.category).toBe('network');
    expect(r.agreement).toBe(1); // only the 20 latest were read
    expect(classifyGroup(g, ds, { ...DEFAULT_CONFIG, causeSampleSize: 30 }).agreement).toBeCloseTo(20 / 30);
  });

  it('a mixed group: the majority wins, unknown loses a tie, and a mostly unknown group stays unknown (reported)', () => {
    const mix = (unknown: number, network: number) => {
      const ds = build([
        ...Array.from({ length: unknown }, (_, i) => ({ run: i % 12, test: `u${i}`, message: PLAIN })),
        ...Array.from({ length: network }, (_, i) => ({ run: i % 12, test: `n${i}`, message: 'Error: expect(received).toBe(expected) // Object.is equality\n\nExpected: 200\nReceived: 503' })),
      ]);
      const g = { ...groupFailures(ds, DEFAULT_CONFIG)[0]!, attemptIds: ds.failures.map((f) => f.attemptId) };
      return classifyGroup(g, ds, DEFAULT_CONFIG);
    };
    expect(mix(8, 2)).toMatchObject({ category: 'unknown', confidence: 'low' });
    expect(mix(5, 5).category).toBe('network'); // a tie goes to the real category
    expect(mix(2, 8)).toMatchObject({ category: 'network', agreement: 0.8 });
  });

  it('an environment event group is infrastructure with the quoted network line', () => {
    const { groups, results } = classify(Array.from({ length: 5 }, (_, i) => ({ run: 6, test: `t${i}`, message: `Error: apiRequestContext.get: socket hang up (ECONNRESET)\nCall log: ${i}` })));
    expect(groups[0]!.environmentEvent).toBe(true);
    expect(results[0]!.category).toBe('infrastructure');
    expect(results[0]!.evidence.some((e) => e.text.includes('ECONNRESET'))).toBe(true);
  });

  it('a missing failure in the dataset is skipped, an empty group is unknown', () => {
    const ds = build([{ run: 0, test: 't0', message: STRICT }]);
    const g = { ...groupFailures(ds, DEFAULT_CONFIG)[0]!, attemptIds: ['ghost'] };
    expect(classifyGroup(g, ds, DEFAULT_CONFIG)).toMatchObject({ category: 'unknown', confidence: 'low', evidence: [] });
  });
});
