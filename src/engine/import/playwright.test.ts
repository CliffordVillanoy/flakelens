import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parsePlaywrightReport } from './playwright';

const read = (f: string) => readFileSync(`fixtures/playwright/${f}`, 'utf8');
const opts = { fileName: 'run.json', importedAt: '2026-11-20T12:00:00.000Z', order: 0 };

it('imports a valid report', () => {
  const r = parsePlaywrightReport(read('valid-basic.json'), opts);
  expect(r.record.result).toBe('success');
  expect(r.record.counts).toEqual({ found: 4, imported: 4, notImported: 0 });
  expect(r.tests.map((t) => t.title).sort()).toEqual(['adds item', 'applies coupon', 'shows total']);
  expect(r.tests[0]!.suitePath).toEqual(['cart']);
  expect(r.tests[0]!.file).toBe('checkout.spec.ts');
  const coupon = r.tests.find((t) => t.title === 'applies coupon')!;
  expect(r.attempts.filter((a) => a.testId === coupon.testId).map((a) => [a.retryIndex, a.status])).toEqual([
    [0, 'fail'],
    [1, 'pass'],
  ]);
  expect(r.failures).toHaveLength(1);
  expect(r.failures[0]!.message).toBe('Timeout 5000ms exceeded');
  expect(r.attempts.find((a) => a.status === 'skip')).toBeDefined();
  expect(r.runs).toHaveLength(1);
  expect(r.record.runIds).toEqual([r.runs[0]!.runId]);
  expect(r.runs[0]!.importId).toBe(r.record.importId);
});

it('flags missing commit and uses the label when given', () => {
  expect(parsePlaywrightReport(read('valid-basic.json'), opts).record.notices.map((n) => n.code)).toContain(
    'import.noCommit',
  );
  const r = parsePlaywrightReport(read('valid-basic.json'), { ...opts, commitLabel: ' c1 ' });
  expect(r.runs[0]!.commit).toBe('c1');
  expect(r.record.notices.map((n) => n.code)).not.toContain('import.noCommit');
});

it('gives each project its own testId but one testKey', () => {
  const r = parsePlaywrightReport(read('two-projects.json'), opts);
  expect(new Set(r.tests.map((t) => t.testId)).size).toBe(2);
  expect(new Set(r.tests.map((t) => t.testKey)).size).toBe(1);
  expect(r.tests.map((t) => t.project).sort()).toEqual(['chromium', 'firefox']);
});

it('handles a missing start time', () => {
  const r = parsePlaywrightReport(read('no-start-time.json'), { ...opts, order: 7 });
  expect(r.record.result).toBe('success');
  expect(r.runs[0]!.startedAt).toBeNull();
  expect(r.runs[0]!.order).toBe(7);
  expect(r.runs[0]!.runId).not.toBe(parsePlaywrightReport(read('valid-basic.json'), opts).runs[0]!.runId);
});

it('keeps hostile strings verbatim', () => {
  const text = read('valid-basic.json').replace('adds item', '<script>alert(1)</script>');
  const r = parsePlaywrightReport(text, opts);
  expect(r.tests.map((t) => t.title)).toContain('<script>alert(1)</script>');
});
