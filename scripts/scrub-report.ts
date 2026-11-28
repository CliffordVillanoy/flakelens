import { existsSync, readFileSync, writeFileSync } from 'node:fs';

// DEV-49: the CI report is uploaded as a public artifact, so before the upload this removes what the report would
// otherwise carry about people and the runner: commit author, committer and message body, and absolute paths.
// It keeps the commit hash, short hash, subject, branch, test titles, durations and error text (all FlakeLens needs).
// Run with: node scripts/scrub-report.ts [report.json]   (in place; a missing file is fine, a bad file fails the step)
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = { [key: string]: Json };

const isObj = (v: Json | undefined): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const slashes = (s: string) => s.replace(/\\/g, '/');

export function scrubReport(report: Json): Json {
  if (!isObj(report)) return report;
  const config = isObj(report.config) ? report.config : {};
  const metadata = isObj(config.metadata) ? config.metadata : {};
  if (isObj(metadata.gitCommit)) {
    for (const key of ['author', 'committer', 'body']) delete metadata.gitCommit[key];
  }
  // The repo root is the parent of the test folder; every absolute path in the report starts with it.
  const root = typeof config.rootDir === 'string' ? slashes(config.rootDir).replace(/\/[^/]+$/, '') : '';
  const clean = (v: Json): Json => {
    if (typeof v === 'string') return root ? slashes(v).split(`${root}/`).join('').split(root).join('.') : v;
    if (Array.isArray(v)) return v.map(clean);
    if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)]));
    return v;
  };
  return clean(report);
}

if (process.argv[1]?.endsWith('scrub-report.ts')) {
  const file = process.argv[2] ?? 'test-results/report.json';
  if (existsSync(file)) writeFileSync(file, JSON.stringify(scrubReport(JSON.parse(readFileSync(file, 'utf8')) as Json)));
}
