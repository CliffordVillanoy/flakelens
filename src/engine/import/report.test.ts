import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseReport } from './report';

const opts = { fileName: 'r', importedAt: '2026-11-25T10:00:00.000Z', order: 0 };
const codes = (text: string) => parseReport(text, opts).record.notices.map((n) => n.code);

it('a Playwright JSON object goes to the Playwright importer', () => {
  const r = parseReport(readFileSync('fixtures/playwright/valid-basic.json', 'utf8'), opts);
  expect(r.record.result).toBe('success');
  expect(r.tests.length).toBeGreaterThan(0);
  expect(r.tests[0]!.project).not.toBeNull();
});

it('an XML document with a testsuites or testsuite root goes to the JUnit importer, also after a byte-order mark and blank lines', () => {
  for (const text of [readFileSync('fixtures/junit/valid.xml', 'utf8'), '﻿\n  ' + readFileSync('fixtures/junit/surefire-rerun.xml', 'utf8')]) {
    const r = parseReport(text, opts);
    expect(r.record.result).not.toBe('failed');
    expect(r.attempts.length).toBeGreaterThan(0);
  }
});

it('unknown formats fail with the format notice: XML with another root, a JSON object that is not a report, a JSON array', () => {
  expect(codes(readFileSync('fixtures/junit/wrong-format.xml', 'utf8'))).toEqual(['import.fail.format']);
  expect(codes('{"hello":"world"}')).toEqual(['import.fail.format']);
  expect(codes('[1,2,3]')).toEqual(['import.fail.format']);
});

it('empty, whitespace-only and plain text are unreadable, not a format question', () => {
  for (const text of ['', '  \n ', 'just some text', '<', '<testsuite']) expect([text, codes(text)]).toEqual([text, ['import.fail.unreadable']]);
});

it('never throws, whatever it is given', () => {
  for (const text of ['\u0000', '<?xml', '{', '}', '<a>'.repeat(1000), '{"suites":'.repeat(1000)]) expect(() => parseReport(text, opts)).not.toThrow();
});
