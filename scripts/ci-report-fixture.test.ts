import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseReport } from '../src/engine/import/report';
import { scrubReport } from './scrub-report';
import { ALLOWED_TOP, verifyReport } from './verify-report';

// A REAL Playwright report from this repo's e2e run, passed through scripts/scrub-report.ts (DEV-50). These tests fail on
// purpose when the allowlist output changes shape, or when Playwright is bumped, so the fixture is re-recorded and the
// allowlist is looked at again. To re-record: run `CI=1 npm run e2e` (or part of it), copy test-results/report.json, run
// `node scripts/scrub-report.ts <copy>`, check it with `node scripts/verify-report.ts <copy>`, and replace the fixture.
type Json = Parameters<typeof scrubReport>[0];
const fixture = () => JSON.parse(readFileSync('fixtures/ci-report/report.json', 'utf8')) as Json & { config: { version: string } };

// Every key path in the output, arrays collapsed to [], with the type of each leaf.
function shape(v: Json): string[] {
  const paths = new Set<string>();
  const walk = (x: Json, p: string) => {
    if (Array.isArray(x)) {
      if (x.length === 0) paths.add(`${p}[]`);
      for (const y of x) walk(y, `${p}[]`);
    } else if (x !== null && typeof x === 'object') for (const [k, y] of Object.entries(x)) walk(y, `${p}.${k}`);
    else paths.add(`${p}:${x === null ? 'null' : typeof x}`);
  };
  walk(v, '$');
  return [...paths].sort();
}

it('the scrubbed real report has exactly the top-level keys the verifier allows', () => {
  expect(Object.keys(fixture())).toEqual(['config', 'suites', 'errors', 'stats']);
  expect(Object.keys(fixture()).sort()).toEqual([...ALLOWED_TOP].sort());
});

it('the output shape is the one the allowlist produces (a change here is a change to what CI uploads)', () => {
  expect(shape(fixture())).toEqual([
    '$.config.filteredProjects[].name:string',
    '$.config.filteredProjects[].use.defaultBrowserType:string',
    '$.config.metadata.gitCommit.branch:string',
    '$.config.metadata.gitCommit.hash:string',
    '$.config.metadata.gitCommit.shortHash:string',
    '$.config.metadata.gitCommit.subject:string',
    '$.config.projects[].id:string',
    '$.config.projects[].name:string',
    '$.config.shard:null',
    '$.config.version:string',
    '$.errors[]',
    '$.stats.duration:number',
    '$.stats.expected:number',
    '$.stats.flaky:number',
    '$.stats.skipped:number',
    '$.stats.startTime:string',
    '$.stats.unexpected:number',
    '$.suites[].column:number',
    '$.suites[].file:string',
    '$.suites[].line:number',
    '$.suites[].specs[].column:number',
    '$.suites[].specs[].file:string',
    '$.suites[].specs[].id:string',
    '$.suites[].specs[].line:number',
    '$.suites[].specs[].ok:boolean',
    '$.suites[].specs[].tags[]',
    '$.suites[].specs[].tests[].expectedStatus:string',
    '$.suites[].specs[].tests[].projectId:string',
    '$.suites[].specs[].tests[].projectName:string',
    '$.suites[].specs[].tests[].results[].duration:number',
    '$.suites[].specs[].tests[].results[].errors[]',
    '$.suites[].specs[].tests[].results[].retry:number',
    '$.suites[].specs[].tests[].results[].startTime:string',
    '$.suites[].specs[].tests[].results[].status:string',
    '$.suites[].specs[].tests[].status:string',
    '$.suites[].specs[].title:string',
    '$.suites[].title:string',
  ]);
});

it('scrubbing the real report changes nothing (the scrub is stable on its own output) and the verifier finds nothing', () => {
  expect(scrubReport(fixture())).toEqual(fixture());
  expect(verifyReport(fixture(), readFileSync('fixtures/ci-report/report.json').length)).toEqual([]);
});

it('Playwright was not bumped since the fixture was recorded: if it was, record a new one and look at the allowlist again', () => {
  const installed = (JSON.parse(readFileSync('node_modules/@playwright/test/package.json', 'utf8')) as { version: string }).version;
  expect(fixture().config.version, 'fixtures/ci-report/report.json was recorded with another Playwright version: re-record it (see the comment at the top of this file)').toBe(installed);
});

it('FlakeLens imports the scrubbed real report and shows its commit, branch and browser', () => {
  const r = parseReport(readFileSync('fixtures/ci-report/report.json', 'utf8'), { fileName: 'report.json', importedAt: '2026-11-28T00:00:00.000Z', order: 0 });
  expect(r.record.result).toBe('success');
  expect(r.record.notices.map((n) => n.code)).not.toContain('import.noCommit');
  const hash = (fixture() as unknown as { config: { metadata: { gitCommit: { hash: string; branch: string } } } }).config.metadata.gitCommit;
  expect(r.runs[0]).toMatchObject({ commit: hash.hash, branch: hash.branch, browser: 'chromium' });
  expect(r.tests.length).toBeGreaterThan(5);
  expect(r.attempts.length).toBeGreaterThanOrEqual(r.tests.length);
});
