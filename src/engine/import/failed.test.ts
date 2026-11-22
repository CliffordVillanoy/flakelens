import { it, expect } from 'vitest';
import { failedImport } from './failed';

it('builds a failed import record without parsing anything', () => {
  const r = failedImport({ fileName: 'big.json', importedAt: '2026-11-22T10:00:00.000Z' }, 'import.fail.tooLarge', { limit: '50 MB' });
  expect(r.record).toMatchObject({
    fileName: 'big.json',
    result: 'failed',
    counts: { found: 0, imported: 0, notImported: 0 },
    runIds: [],
    notices: [{ code: 'import.fail.tooLarge', severity: 'error', params: { file: 'big.json', limit: '50 MB' } }],
  });
  expect([r.runs, r.tests, r.attempts, r.failures]).toEqual([[], [], [], []]);
});

it('the id depends on file, time and code, so the same file dropped twice is made unique later, not here', () => {
  const o = { fileName: 'a.json', importedAt: '2026-11-22T10:00:00.000Z' };
  expect(failedImport(o, 'import.fail.tooLarge').record.importId).toBe(failedImport(o, 'import.fail.tooLarge').record.importId);
  expect(failedImport(o, 'import.fail.tooLarge').record.importId).not.toBe(failedImport(o, 'import.fail.format').record.importId);
});
