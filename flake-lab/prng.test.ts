import { it, expect } from 'vitest';
import { labRandom, mulberry32 } from './prng';

it('mulberry32 is deterministic and stays in [0, 1)', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const xs = Array.from({ length: 1000 }, () => a());
  expect(xs).toEqual(Array.from({ length: 1000 }, () => b()));
  expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  expect(new Set(xs).size).toBeGreaterThan(990);
});

it('different seeds give different streams', () => {
  expect(mulberry32(1)()).not.toBe(mulberry32(2)());
});

it('labRandom seeds from run, title and retry', () => {
  expect(labRandom(3, 'flaky: timing', 0)()).toBe(labRandom(3, 'flaky: timing', 0)());
  expect(labRandom(3, 'flaky: timing', 0)()).not.toBe(labRandom(3, 'flaky: timing', 1)());
  expect(labRandom(3, 'flaky: timing', 0)()).not.toBe(labRandom(4, 'flaky: timing', 0)());
});

it('mean is near 0.5', () => {
  const r = mulberry32(7);
  const mean = Array.from({ length: 10_000 }, () => r()).reduce((s, x) => s + x, 0) / 10_000;
  expect(mean).toBeGreaterThan(0.48);
  expect(mean).toBeLessThan(0.52);
});

// ---- simulated durations (DEV-34) ----
import { labMs } from './prng';

it('labMs is seeded, inside its range, and does not touch the outcome stream', () => {
  expect(labMs(3, 'flaky: timing', 0, 3000, 40000)).toBe(labMs(3, 'flaky: timing', 0, 3000, 40000));
  const xs = Array.from({ length: 500 }, (_, i) => labMs(i % 12, `t${i}`, i % 2, 500, 3000));
  expect(xs.every((x) => x >= 500 && x <= 3000)).toBe(true);
  expect(new Set(xs).size).toBeGreaterThan(100);
  const before = labRandom(5, 'flaky: random data', 1)();
  labMs(5, 'flaky: random data', 1, 3000, 40000);
  expect(labRandom(5, 'flaky: random data', 1)()).toBe(before); // outcomes never change
});
