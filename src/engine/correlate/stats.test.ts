import { it, expect } from 'vitest';
import fc from 'fast-check';
import { chiSquareSurvival, chiSquareTable, fisherExact, logFactorial, oddsRatio } from './stats';

// Exact reference with big integers: P(table) = C(r1,a) C(r2,c) / C(n,c1); the two-sided p adds every table that is no more likely.
const choose = (n: number, k: number): bigint => {
  let r = 1n;
  for (let i = 1; i <= k; i++) r = (r * BigInt(n - k + i)) / BigInt(i);
  return r;
};
const exactP = (a: number, b: number, c: number, d: number): number => {
  const r1 = a + b, r2 = c + d, c1 = a + c, n = r1 + r2;
  const total = choose(n, c1);
  const at = (x: number) => choose(r1, x) * choose(r2, c1 - x);
  const observed = at(a);
  let sum = 0n;
  for (let x = Math.max(0, c1 - r2); x <= Math.min(r1, c1); x++) if (at(x) <= observed) sum += at(x);
  return Number(sum * 10n ** 30n / total) / 1e30;
};

it('logFactorial is exact for small n and grows', () => {
  expect(logFactorial(0)).toBe(0);
  expect(logFactorial(1)).toBe(0);
  expect(Math.exp(logFactorial(5))).toBeCloseTo(120, 9);
  expect(logFactorial(170)).toBeCloseTo(706.5730622457874, 9);
  expect(logFactorial(10_000)).toBeGreaterThan(logFactorial(9_999));
});

it('Fisher known results', () => {
  expect(fisherExact(3, 1, 1, 3)).toBeCloseTo(34 / 70, 9); // the tea-tasting table
  expect(fisherExact(1, 9, 11, 3)).toBeCloseTo(0.002759456185, 9); // the textbook 2x2 (R: fisher.test)
  expect(fisherExact(0, 5, 5, 0)).toBeCloseTo(2 / 252, 9);
  expect(fisherExact(5, 5, 5, 5)).toBeCloseTo(1, 9);
  expect(fisherExact(0, 0, 0, 0)).toBe(1);
  expect(fisherExact(10, 0, 0, 10)).toBeCloseTo(2 / 184756, 9);
  expect(fisherExact(24, 0, 0, 12)).toBeCloseTo(1 / 1251677700, 12); // two groups with no overlap
});

it('Fisher matches the exact big-integer reference on many tables (tolerance 1e-9)', () => {
  for (const [a, b, c, d] of [[2, 7, 8, 2], [0, 12, 4, 8], [6, 6, 1, 9], [3, 17, 9, 11], [14, 2, 3, 13], [1, 1, 1, 1], [20, 30, 25, 25], [0, 3, 3, 0], [7, 0, 2, 5]] as const) {
    expect(Math.abs(fisherExact(a, b, c, d) - exactP(a, b, c, d))).toBeLessThan(1e-9);
  }
});

it('Fisher properties: p in 0..1, symmetric under swapping categories, invariant to row and column order', () => {
  fc.assert(
    fc.property(fc.nat(60), fc.nat(60), fc.nat(60), fc.nat(60), (a, b, c, d) => {
      const p = fisherExact(a, b, c, d);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      expect(fisherExact(c, d, a, b)).toBeCloseTo(p, 12); // rows swapped
      expect(fisherExact(b, a, d, c)).toBeCloseTo(p, 12); // columns swapped
      expect(fisherExact(a, c, b, d)).toBeCloseTo(p, 12); // transposed
    }),
    { numRuns: 300 },
  );
});

it('odds ratio uses a 0.5 correction, so zero cells stay finite', () => {
  expect(oddsRatio(10, 0, 0, 10)).toBeCloseTo((10.5 * 10.5) / (0.5 * 0.5), 9);
  expect(oddsRatio(5, 5, 5, 5)).toBeCloseTo(1, 12);
  expect(oddsRatio(0, 0, 0, 0)).toBe(1);
  expect(Number.isFinite(oddsRatio(0, 9, 9, 0))).toBe(true);
  expect(oddsRatio(8, 2, 2, 8)).toBeGreaterThan(1);
  expect(oddsRatio(2, 8, 8, 2)).toBeLessThan(1);
});

it('chi-square survival matches known values', () => {
  expect(chiSquareSurvival(3.841458820694124, 1)).toBeCloseTo(0.05, 9);
  expect(chiSquareSurvival(5.991464547107979, 2)).toBeCloseTo(0.05, 9);
  expect(chiSquareSurvival(9.21034037197618, 2)).toBeCloseTo(0.01, 9);
  expect(chiSquareSurvival(0, 3)).toBe(1);
  expect(chiSquareSurvival(1000, 3)).toBeLessThan(1e-100);
});

it('chi-square table: p only when every expected count is at least 5, otherwise skipped (null)', () => {
  // rows = values, columns = [failed, passed]; expected counts: rows 30/30/30, fail share 0.5 -> 15 each, all >= 5
  const big = chiSquareTable([[20, 10], [15, 15], [10, 20]]);
  expect(big).not.toBeNull();
  expect(big!.df).toBe(2);
  expect(big!.p).toBeCloseTo(chiSquareSurvival(big!.statistic, 2), 12);
  expect(big!.statistic).toBeCloseTo(6.666666666666667, 9);
  // an expected count of 3 (row of 6 with a fail share of 0.5) skips the test
  expect(chiSquareTable([[3, 3], [20, 20], [20, 20]])).toBeNull();
  expect(chiSquareTable([[0, 0], [20, 20], [20, 20]])).toBeNull(); // empty row
  expect(chiSquareTable([[10, 10]])).toBeNull(); // one row
  expect(chiSquareTable([[10, 0], [10, 0], [10, 0]])).toBeNull(); // one column has nothing
});

it('chi-square p is invariant to row order and in 0..1', () => {
  fc.assert(
    fc.property(fc.array(fc.tuple(fc.integer({ min: 20, max: 60 }), fc.integer({ min: 20, max: 60 })), { minLength: 3, maxLength: 6 }), (rows) => {
      const t = chiSquareTable(rows);
      expect(t).not.toBeNull();
      expect(t!.p).toBeGreaterThanOrEqual(0);
      expect(t!.p).toBeLessThanOrEqual(1);
      expect(chiSquareTable([...rows].reverse())!.p).toBeCloseTo(t!.p, 12);
    }),
    { numRuns: 200 },
  );
});
