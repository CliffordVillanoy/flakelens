import { expect, it } from 'vitest';
import { scrubReport } from './scrub-report';

const report = () => ({
  config: {
    rootDir: '/home/runner/work/flakelens/flakelens/e2e',
    configFile: '/home/runner/work/flakelens/flakelens/playwright.config.ts',
    metadata: {
      gitCommit: {
        hash: '4e06c97aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        shortHash: '4e06c97',
        subject: 'Merge abc into def',
        body: 'private body text',
        branch: 'main',
        author: { name: 'A Person', email: 'a@example.com', time: 1 },
        committer: { name: 'GitHub', email: 'noreply@github.com', time: 1 },
      },
    },
  },
  suites: [
    {
      file: 'import.spec.ts',
      specs: [{ title: 't', tests: [{ results: [{ error: { message: 'x', location: { file: '/home/runner/work/flakelens/flakelens/e2e/import.spec.ts', line: 3 } } }] }] }],
    },
  ],
});

it('removes author, committer and body, keeps hash, branch and subject', () => {
  const out = JSON.stringify(scrubReport(report()));
  for (const gone of ['A Person', 'a@example.com', 'noreply@github.com', 'private body text']) expect(out).not.toContain(gone);
  for (const kept of ['4e06c97aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '"branch":"main"', 'Merge abc into def']) expect(out).toContain(kept);
});

it('turns every absolute repo path into a relative one', () => {
  const out = scrubReport(report()) as { config: { rootDir: string; configFile: string } };
  expect(JSON.stringify(out)).not.toContain('/home/runner');
  expect(out.config.configFile).toBe('playwright.config.ts');
  expect(out.config.rootDir).toBe('e2e');
  expect(JSON.stringify(out)).toContain('"file":"e2e/import.spec.ts"');
});

it('also handles Windows separators and leaves a report without a root alone', () => {
  const win = { config: { rootDir: 'D:\\code\\repo\\e2e', configFile: 'D:\\code\\repo\\playwright.config.ts' } };
  expect(JSON.stringify(scrubReport(win))).not.toContain('D:');
  expect(scrubReport({ suites: [] })).toEqual({ suites: [] });
});
