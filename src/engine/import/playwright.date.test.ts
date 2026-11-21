import { it, expect } from 'vitest';
import { parsePlaywrightReport } from './playwright';

const opts = { fileName: 'run.json', importedAt: '2026-11-21T12:00:00.000Z', order: 0, commitLabel: 'c1' };
const report = (stats: unknown) =>
  JSON.stringify({
    config: {},
    stats,
    suites: [
      {
        title: 'a.spec.ts',
        file: 'a.spec.ts',
        specs: [{ title: 'x', tests: [{ projectName: 'chromium', results: [{ status: 'passed', retry: 0, duration: 5 }] }] }],
      },
    ],
  });

it('an unreadable start time gives import.partial.badDate (info) and the import stays success', () => {
  for (const startTime of ['not a date', 12345, {}]) {
    const r = parsePlaywrightReport(report({ startTime }), opts);
    expect(r.record.result).toBe('success');
    expect(r.runs[0]!.startedAt).toBeNull();
    expect(r.record.notices).toContainEqual({ code: 'import.partial.badDate', severity: 'info', params: { file: 'run.json' } });
  }
});

it('a missing or readable start time gives no badDate notice', () => {
  for (const stats of [undefined, {}, { startTime: null }, { startTime: '2026-11-20T10:00:00.000Z' }]) {
    const r = parsePlaywrightReport(report(stats), opts);
    expect(r.record.notices.map((n) => n.code)).not.toContain('import.partial.badDate');
  }
});
