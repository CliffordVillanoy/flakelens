import { it, expect } from 'vitest';
import { catalog, t, type CopyKey } from './copy';

it('formats ICU plurals', () => {
  expect(t('import.reading', { count: 1 })).toBe('Reading 1 file…');
  expect(t('import.reading', { count: 3 })).toBe('Reading 3 files…');
  expect(t('import.partial', { tests: 211, runs: 12, count: 3 })).toBe(
    'Imported 211 tests from 12 runs. 3 results were not imported.',
  );
  expect(t('import.partial', { tests: 5, runs: 1, count: 1 })).toBe(
    'Imported 5 tests from 1 runs. 1 result was not imported.',
  );
});

it('fills named params and keeps plain strings', () => {
  expect(t('import.fail.unreadable', { file: 'run.json' })).toBe(
    "run.json couldn't be read. It may be cut off. Try downloading it again.",
  );
  expect(t('header.privacy')).toBe('Nothing leaves this browser');
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
