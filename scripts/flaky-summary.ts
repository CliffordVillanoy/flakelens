import { appendFileSync, existsSync, readFileSync } from 'node:fs';

// DEV-49: lists the tests a Playwright JSON report marks "flaky" (failed, then passed on a retry) as Markdown lines.
// CI appends the result to the job summary so a retry never hides a problem. Run with: node scripts/flaky-summary.ts
type Suite = { specs?: { title: string; file: string; tests: { status: string }[] }[]; suites?: Suite[] };

export function flakyTests(report: { suites?: Suite[] }): string[] {
  const found = new Set<string>();
  const walk = (suite: Suite) => {
    for (const spec of suite.specs ?? []) if (spec.tests.some((t) => t.status === 'flaky')) found.add(`${spec.file}: ${spec.title}`);
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites ?? []) walk(suite);
  return [...found];
}

export function summary(report: { suites?: Suite[] } | null): string {
  if (!report) return 'No e2e report was written.';
  const flaky = flakyTests(report);
  return flaky.length ? `### Flaky e2e tests (passed on retry)\n${flaky.map((f) => `- ${f}`).join('\n')}` : 'No flaky e2e tests in this run.';
}

// One GitHub warning annotation per flaky test: shown on the run page and the PR checks, not only in the summary.
export const annotations = (report: { suites?: Suite[] }): string[] => flakyTests(report).map((f) => `::warning title=Flaky e2e test::${f}`);

if (process.argv[1]?.endsWith('flaky-summary.ts')) {
  const file = process.argv[2] ?? 'test-results/report.json';
  const report = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  const text = summary(report);
  if (report && process.env.GITHUB_ACTIONS) for (const line of annotations(report)) console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  else console.log(text);
}
