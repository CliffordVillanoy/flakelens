import { it, expect } from 'vitest';
import { DEFAULT_CONFIG, type EngineConfig } from './config';

it('failure grouping thresholds live in the config with their starting values (DEV-36)', () => {
  const config: EngineConfig = DEFAULT_CONFIG;
  expect(config.groupMergeJaccard).toBe(0.8);
  expect(config.envEventMinTests).toBe(5);
  expect(config.groupMergeJaccard).toBeGreaterThan(0);
  expect(config.groupMergeJaccard).toBeLessThanOrEqual(1);
  expect(Number.isInteger(config.envEventMinTests)).toBe(true);
});

it('the scoring thresholds did not change', () => {
  expect(DEFAULT_CONFIG).toMatchObject({ failingRate: 0.95, failingWindow: 10, minAttempts: 3, suspectMinAttempts: 5, suspectMinFlipRate: 0.2 });
});
