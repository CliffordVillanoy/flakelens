import { it, expect } from 'vitest';
import { catalog, t, type CopyKey } from './copy';

it('formats ICU plurals', () => {
  expect(t('import.reading', { count: 1 })).toBe('Reading 1 file…');
  expect(t('import.reading', { count: 3 })).toBe('Reading 3 files…');
  expect(t('import.partial', { tests: 211, runs: 12, count: 3 })).toBe(
    'Imported 211 tests from 12 runs. 3 results were not imported.',
  );
  expect(t('import.partial', { tests: 5, runs: 1, count: 1 })).toBe(
    'Imported 5 tests from 1 run. 1 result was not imported.',
  );
});

it('never says "1 runs" or "1 tests" (copy rule 3)', () => {
  expect(t('import.success', { tests: 1, runs: 1 })).toBe('Imported 1 test from 1 run.');
  expect(t('import.added', { newRuns: 1, tests: 1, runs: 1 })).toBe('Added 1 run. Now 1 test from 1 run.');
  expect(t('import.added', { newRuns: 3, tests: 211, runs: 12 })).toBe('Added 3 runs. Now 211 tests from 12 runs.');
});

it('composes the live result count', () => {
  expect(t('tests.count.all', { count: 211, sort: 'most urgent first' })).toBe('Showing all 211 tests, grouped by status, most urgent first');
  expect(t('tests.count.all', { count: 1, sort: 'most urgent first' })).toBe('Showing all 1 test, grouped by status, most urgent first');
  expect(t('tests.count.status', { count: 1, status: 'Flaky', sort: 'most urgent first' })).toBe('Showing 1 Flaky test, grouped by status, most urgent first');
  expect(t('tests.count.search', { count: 2, query: 'coupon', sort: 'most urgent first' })).toBe('Showing 2 tests matching "coupon", grouped by status, most urgent first');
  expect(t('tests.count.statusSearch', { count: 1, status: 'Flaky', query: 'coupon', sort: 'most urgent first' })).toBe(
    'Showing 1 Flaky test matching "coupon", grouped by status, most urgent first',
  );
});

it('fills named params and keeps plain strings', () => {
  expect(t('import.fail.unreadable', { file: 'run.json' })).toBe(
    "run.json couldn't be read. It may be cut off. Try downloading it again.",
  );
  expect(t('app.name')).toBe('FlakeLens');
});

it('throws on a missing param, so typos fail loudly', () => {
  expect(() => t('import.reading')).toThrow(/count/);
  expect(() => t('import.fail.format', { fle: 'x' })).toThrow(/file/);
});

it('uses the renames: Unproven and Evidence', () => {
  expect(t('tests.filter.suspect')).toBe('Unproven');
  expect(t('status.suspect')).toBe('Unproven');
  expect(t('tests.col.why')).toBe('Evidence');
  expect(t('status.insufficient')).toBe('Not enough data');
});

it('every catalog entry is a non-empty string', () => {
  const keys = Object.keys(catalog) as CopyKey[];
  expect(keys.length).toBeGreaterThan(100);
  for (const k of keys) expect([k, typeof catalog[k], catalog[k].trim().length > 0]).toEqual([k, 'string', true]);
});

it('the retired header privacy keys are gone (DEV-34); the privacy statement stays on Start', () => {
  for (const key of ['header.privacy', 'header.privacy.hint', 'header.privacy.short']) expect(key in catalog, key).toBe(false);
  expect(catalog['start.privacy']).toBe('Your files stay in this browser. Nothing is uploaded.');
});
