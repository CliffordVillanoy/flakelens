import { it, expect } from 'vitest';
import fc from 'fast-check';
import { ema, wilsonLower } from './stats';

it('wilson stays in [0,1] and grows with evidence', () => {
  fc.assert(
    fc.property(fc.nat(500), fc.nat(500), (a, b) => {
      const w = wilsonLower(a, a + b, 1.96);
      return w >= 0 && w <= 1;
    }),
  );
  expect(wilsonLower(0, 0, 1.96)).toBe(0);
  expect(wilsonLower(8, 20, 1.96)).toBeGreaterThan(wilsonLower(1, 2, 1.96));
});

it('ema', () => {
  expect(ema([], 0.3)).toBe(0);
  expect(ema([1, 1, 1], 0.3)).toBeCloseTo(1);
  expect(ema([0, 1], 0.3)).toBeCloseTo(0.3);
});
