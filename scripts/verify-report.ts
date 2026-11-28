import { existsSync, readFileSync, statSync } from 'node:fs';
import { redactSecrets } from '../src/engine/group/normalize.ts';

// DEV-50: the check that runs AFTER scripts/scrub-report.ts and before the report is uploaded. It fails (exit 1) when the
// report still holds anything the scrub should have removed, so a gap in the scrub stops the upload instead of leaking.
// It rejects:
//   - a file over 2 MB (or one that is not a JSON object)
//   - a top-level key other than config, suites, errors, stats (a new Playwright field the allowlist does not know)
//   - the keys gitDiff, author or committer anywhere, and any key NAME that the scrub does not emit, at any depth
//     (ALLOWED_KEYS below equals what scrub-report.ts writes; a field such as committerName or actor is refused)
//   - any email-like text, even a noreply address, in a value or a key
//   - an absolute path: /home/, /Users/, /root/, /__w/ (runner), or a drive path such as C:\ or D:/
//   - secret-like text in a free-text value (title, message, stack, subject, branch, name): the same patterns the app's
//     redactSecrets masks, so a clean scrub leaves nothing for it to find
// It prints what kind of problem and where (a key path), never the value. A missing file is fine (nothing to upload).
// Run with: node scripts/verify-report.ts [report.json]
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export const MAX_BYTES = 2_000_000;
export const ALLOWED_TOP = ['config', 'suites', 'errors', 'stats'];
const FORBIDDEN_KEYS = new Set(['gitDiff', 'author', 'committer']);
// Every key name the scrub can emit, at any depth. Keep it equal to scripts/scrub-report.ts: a key outside it is a field the
// allowlist never produced, so something other than the scrub touched the report (or the two scripts drifted apart).
export const ALLOWED_KEYS = new Set([
  ...ALLOWED_TOP,
  'version', 'shard', 'current', 'total', 'metadata', 'gitCommit', 'hash', 'shortHash', 'subject', 'branch', 'os',
  'projects', 'filteredProjects', 'id', 'name', 'use', 'defaultBrowserType',
  'title', 'file', 'line', 'column', 'specs', 'tests', 'tags', 'ok', 'projectId', 'projectName', 'expectedStatus', 'status',
  'results', 'duration', 'retry', 'startTime', 'error', 'message', 'stack',
  'expected', 'skipped', 'unexpected', 'flaky',
]);
const MAX_PROBLEMS = 1_000; // a report full of unknown keys stops being read after this many
const FREE_TEXT_KEYS = new Set(['title', 'message', 'stack', 'subject', 'branch', 'name']);
const TEXT_CAP = 50_000;

const EMAIL = /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){1,8}/;
const DRIVE_PATH = /(?<![A-Za-z0-9])[A-Za-z]:[\\/]/;
const UNIX_PATH = /(?<![\w:.-])\/(?:home|Users|root|__w)\//;

export interface Problem {
  kind: 'size' | 'not-an-object' | 'unknown-top-level-key' | 'unknown-key' | 'forbidden-key' | 'email' | 'absolute-path' | 'secret-like';
  at: string; // a key path such as suites[0].specs[2].title, never the value
}

const textProblems = (s: string, key: string, at: string, out: Problem[]) => {
  const t = s.length > TEXT_CAP ? s.slice(0, TEXT_CAP) : s;
  if (EMAIL.test(t)) out.push({ kind: 'email', at });
  if (DRIVE_PATH.test(t) || UNIX_PATH.test(t)) out.push({ kind: 'absolute-path', at });
  // Branch and subject are plain names: the same check the scrub used for them (no long-run masking).
  if (FREE_TEXT_KEYS.has(key) && redactSecrets(t, { runs: key !== 'branch' && key !== 'subject' }) !== t) out.push({ kind: 'secret-like', at });
};

export function verifyReport(report: Json, bytes: number): Problem[] {
  const out: Problem[] = [];
  if (bytes > MAX_BYTES) {
    out.push({ kind: 'size', at: `${bytes} bytes` });
    return out; // not worth reading
  }
  if (typeof report !== 'object' || report === null || Array.isArray(report)) return [{ kind: 'not-an-object', at: '$' }];
  for (const k of Object.keys(report)) if (!ALLOWED_TOP.includes(k)) out.push({ kind: 'unknown-top-level-key', at: k });
  // An explicit stack, not recursion: a deeply nested report cannot overflow the call stack.
  const stack: { value: Json; at: string; key: string }[] = [{ value: report, at: '$', key: '' }];
  while (stack.length > 0 && out.length < MAX_PROBLEMS) {
    const { value, at, key } = stack.pop()!;
    if (typeof value === 'string') textProblems(value, key, at, out);
    else if (Array.isArray(value)) value.forEach((v, i) => stack.push({ value: v, at: `${at}[${i}]`, key }));
    else if (typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value)) {
        if (out.length >= MAX_PROBLEMS) break;
        const here = at === '$' ? k : `${at}.${k}`;
        if (FORBIDDEN_KEYS.has(k)) out.push({ kind: 'forbidden-key', at: here });
        else if (!ALLOWED_KEYS.has(k) && !(at === '$' && !ALLOWED_TOP.includes(k))) out.push({ kind: 'unknown-key', at: here }); // top-level strangers are reported once, above
        textProblems(k, '', here, out); // a key can carry an email or a path too
        stack.push({ value: v, at: here, key: k });
      }
    }
  }
  return out;
}

if (process.argv[1]?.endsWith('verify-report.ts')) {
  const file = process.argv[2] ?? 'test-results/report.json';
  if (!existsSync(file)) {
    console.log(`verify-report: ${file} not found, nothing to check`);
  } else {
    let problems: Problem[];
    try {
      problems = verifyReport(JSON.parse(readFileSync(file, 'utf8')) as Json, statSync(file).size);
    } catch {
      problems = [{ kind: 'not-an-object', at: 'file is not valid JSON' }];
    }
    if (problems.length > 0) {
      for (const p of problems.slice(0, 200)) console.error(`verify-report: ${p.kind} at ${p.at}`);
      if (problems.length > 200) console.error(`verify-report: and ${problems.length - 200} more`);
      process.exit(1);
    }
    console.log('verify-report: clean');
  }
}
