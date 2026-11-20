// Regression tests for the DEV-07 final review findings.
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parsePlaywrightReport } from './playwright';
import { addImport, emptyDataset } from '../dataset';
import { scoreTests } from '../score/score';

const read = (f: string) => readFileSync(`fixtures/playwright/${f}`, 'utf8');
const opts = { fileName: 'run.json', importedAt: '2026-11-20T12:00:00.000Z', order: 0 };
const report = (tests: unknown[], stats: unknown = { startTime: '2026-11-20T10:00:00.000Z' }) =>
  JSON.stringify({
    config: {},
    stats,
    suites: [{ title: 'a.spec.ts', file: 'a.spec.ts', specs: [{ title: 'checks out', file: 'a.spec.ts', tests }], suites: [] }],
  });
const t = (...statuses: string[]) => ({
  projectName: 'chromium',
  results: statuses.map((status, retry) => ({ status, retry, duration: 10 })),
});

it('review I4: a BOM copy of a report has the same run ID, so it is de-duplicated', () => {
  const plain = read('valid-basic.json').replace(/^\uFEFF/, '');
  const a = parsePlaywrightReport(plain, opts);
  const b = parsePlaywrightReport('\uFEFF' + plain, { ...opts, fileName: 'bom.json' });
  expect(b.runs[0]!.runId).toBe(a.runs[0]!.runId);
  const ds = addImport(addImport(emptyDataset(), a), b);
  expect(ds.runs).toHaveLength(1);
  expect(ds.imports[1]!.notices.map((n) => n.code)).toContain('import.dupeRun');
});

it('review I3: a start time that is not a readable date string does not fail the file', () => {
  for (const startTime of [null, 12345, 'not a date', {}]) {
    const r = parsePlaywrightReport(report([t('passed')], { startTime }), opts);
    expect(r.record.result).not.toBe('failed');
    expect(r.runs[0]!.startedAt).toBeNull();
  }
  const r = parsePlaywrightReport(report([t('passed')], { startTime: '2026-11-20T12:00:00+02:00' }), opts);
  expect(r.runs[0]!.startedAt).toBe('2026-11-20T10:00:00.000Z');
});

it('review I1: --repeat-each repeats of one test stay one test, and a fail plus a pass in one run is flaky', () => {
  const r = parsePlaywrightReport(report([t('failed'), t('passed'), t('passed')]), { ...opts, commitLabel: 'c1' });
  expect(r.tests).toHaveLength(1);
  expect(r.record.result).toBe('success');
  expect(r.record.notices.map((n) => n.code)).not.toContain('import.dupeIds');
  expect(r.attempts).toHaveLength(3);
  expect(new Set(r.attempts.map((a) => a.attemptId)).size).toBe(3);
  expect(r.attempts.map((a) => a.repeatIndex)).toEqual([0, 1, 2]);
  const s = scoreTests(addImport(emptyDataset(), r))[0]!;
  expect(s.mixedCommits).toBe(1);
  expect(s.label).toBe('flaky');
});
