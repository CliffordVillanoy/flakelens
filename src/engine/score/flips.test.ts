import { it, expect } from 'vitest';
import fc from 'fast-check';
import { countFlips, countFlipsNaive } from './flips';

it('counts flips like the naive loop', () => {
  fc.assert(fc.property(fc.array(fc.boolean(), { maxLength: 200 }), (xs) => countFlips(xs) === countFlipsNaive(xs)));
});

it('flip examples', () => {
  expect(countFlips([])).toBe(0);
  expect(countFlips([true, false, true])).toBe(2);
  expect(countFlips(Array(33).fill(false).map((_, i) => i === 32))).toBe(1);
});

it('counts flips across 32-bit word boundaries', () => {
  for (const len of [31, 32, 33, 63, 64, 65, 96, 97]) {
    const alt = Array.from({ length: len }, (_, i) => i % 2 === 0);
    expect(countFlips(alt)).toBe(len - 1);
    const edge = Array.from({ length: len }, (_, i) => i >= 32);
    expect(countFlips(edge)).toBe(countFlipsNaive(edge));
  }
});
