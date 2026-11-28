import { existsSync, readFileSync, writeFileSync } from 'node:fs';

// DEV-49: the CI report is uploaded as a public artifact, so before the upload this removes what the report would
// otherwise carry about people and the runner: commit author, committer and message body, the source diff, and
// absolute paths.
// It keeps the commit hash, short hash, subject, branch, test titles, durations and error text (all FlakeLens needs).
// Run with: node scripts/scrub-report.ts [report.json]   (in place; a missing file is fine, a bad file fails the step)
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = { [key: string]: Json };

const isObj = (v: Json | undefined): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const PRIVATE_COMMIT_KEYS = ['author', 'committer', 'body'];
const slashes = (s: string) => s.replace(/\\/g, '/');

// Playwright repeats the metadata under config, config.projects[] and config.filteredProjects[], so the scrub walks the
// whole report instead of one path. gitDiff is the full source diff of the change under test: code, not test results.
export function scrubReport(report: Json): Json {
  if (!isObj(report)) return report;
  const config = isObj(report.config) ? report.config : {};
  // The repo root is the parent of the test folder; every absolute path in the report starts with it.
  const root = typeof config.rootDir === 'string' ? slashes(config.rootDir).replace(/\/[^/]+$/, '') : '';
  const clean = (v: Json, key?: string): Json => {
    if (typeof v === 'string') return root ? slashes(v).split(`${root}/`).join('').split(root).join('.') : v;
    if (Array.isArray(v)) return v.map((x) => clean(x));
    if (!isObj(v)) return v;
    const out: Obj = {};
    for (const [k, x] of Object.entries(v)) {
      if (k === 'gitDiff') continue;
      if (key === 'gitCommit' && PRIVATE_COMMIT_KEYS.includes(k)) continue;
      out[k] = clean(x, k);
    }
    return out;
  };
  return clean(report);
}

if (process.argv[1]?.endsWith('scrub-report.ts')) {
  const file = process.argv[2] ?? 'test-results/report.json';
  if (existsSync(file)) writeFileSync(file, JSON.stringify(scrubReport(JSON.parse(readFileSync(file, 'utf8')) as Json)));
}
