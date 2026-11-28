import { expect, it } from 'vitest';
import { flakyTests, summary } from './flaky-summary';

const spec = (title: string, status: string) => ({ title, file: 'a.spec.ts', tests: [{ status }] });

it('lists flaky specs from nested suites once, and ignores passed and failed ones', () => {
  const report = {
    suites: [{ specs: [spec('one', 'flaky'), spec('two', 'expected')], suites: [{ specs: [spec('three', 'flaky'), spec('three', 'flaky'), spec('four', 'unexpected')] }] }],
  };
  expect(flakyTests(report)).toEqual(['a.spec.ts: one', 'a.spec.ts: three']);
});

it('says so when nothing is flaky or no report was written', () => {
  expect(summary({ suites: [{ specs: [spec('one', 'expected')] }] })).toBe('No flaky e2e tests in this run.');
  expect(summary({})).toBe('No flaky e2e tests in this run.');
  expect(summary(null)).toBe('No e2e report was written.');
});
