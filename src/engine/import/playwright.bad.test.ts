import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { parsePlaywrightReport } from './playwright';
import { DEFAULT_CONFIG } from '../config';

const read = (f: string) => readFileSync(`fixtures/playwright/${f}`, 'utf8');
const opts = { fileName: 'run.json', importedAt: '2026-11-20T12:00:00.000Z', order: 0 };

it.each([
  ['partial-no-status.json', 'partial', 'import.partial.noStatus'],
  ['partial-no-name.json', 'partial', 'import.partial.noName'],
  ['bad-duration.json', 'partial', 'import.partial.badDuration'],
  ['mostly-bad.json', 'failed', 'import.fail.tooBad'],
  ['wrong-format.json', 'failed', 'import.fail.format'],
  ['truncated.json', 'failed', 'import.fail.unreadable'],
  ['empty.json', 'failed', 'import.fail.unreadable'],
  ['deep-nesting.json', 'failed', 'import.fail.tooLarge'],
])('%s → %s with %s', (file, result, code) => {
  const r = parsePlaywrightReport(read(file), opts);
  expect(r.record.result).toBe(result);
  expect(r.record.notices.map((n) => n.code)).toContain(code);
  const c = r.record.counts;
  expect(c.imported + c.notImported).toBe(c.found);
  if (result === 'failed') {
    expect(r.attempts).toHaveLength(0);
    expect(r.runs).toHaveLength(0);
  }
});

it('counts results not imported', () => {
  expect(parsePlaywrightReport(read('partial-no-status.json'), opts).record.counts).toEqual({
    found: 4,
    imported: 3,
    notImported: 1,
  });
  const noName = parsePlaywrightReport(read('partial-no-name.json'), opts);
  expect(noName.record.counts.notImported).toBe(1);
  expect(noName.tests.map((t) => t.title)).not.toContain('');
});

it('keeps results with a bad duration', () => {
  const r = parsePlaywrightReport(read('bad-duration.json'), opts);
  expect(r.record.counts.notImported).toBe(0);
  expect(r.attempts.some((a) => a.durationMs === null)).toBe(true);
});

it('imports a file with a BOM', () => {
  expect(parsePlaywrightReport(read('bom.json'), opts).record.result).toBe('success');
});

it('rejects files over the size limit', () => {
  const r = parsePlaywrightReport('x'.repeat(11), { ...opts, config: { ...DEFAULT_CONFIG, maxFileChars: 10 } });
  expect(r.record.notices[0]!.code).toBe('import.fail.tooLarge');
});

it('makes duplicate test IDs unique and says so', () => {
  const data = JSON.parse(read('valid-basic.json'));
  const specs = data.suites[0].suites[0].specs;
  specs.push(structuredClone(specs[0]));
  const r = parsePlaywrightReport(JSON.stringify(data), opts);
  expect(new Set(r.tests.map((t) => t.testId)).size).toBe(r.tests.length);
  expect(r.record.notices.map((n) => n.code)).toContain('import.dupeIds');
});

it('never throws on arbitrary or mutated input', () => {
  const valid = read('valid-basic.json');
  fc.assert(
    fc.property(fc.string(), (s) => {
      parsePlaywrightReport(s, opts);
    }),
  );
  fc.assert(
    fc.property(fc.nat(valid.length), fc.string(), (i, s) => {
      const r = parsePlaywrightReport(valid.slice(0, i) + s + valid.slice(i), opts);
      expect(r.record.counts.imported + r.record.counts.notImported).toBe(r.record.counts.found);
    }),
  );
  fc.assert(
    fc.property(fc.jsonValue(), (v) => {
      parsePlaywrightReport(JSON.stringify(v), opts);
    }),
  );
});
