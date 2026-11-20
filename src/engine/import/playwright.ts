import { DEFAULT_CONFIG, type EngineConfig } from '../config';
import { hashString } from '../hash';
import type { Attempt, AttemptStatus, Failure, ImportResult, Notice, NoticeCode, Run, Test } from '../types';
import { reportSchema, resultSchema, specSchema, suiteSchema, testSchema } from './schema';

export interface ParseOptions {
  fileName: string;
  importedAt: string;
  commitLabel?: string;
  order: number;
  config?: EngineConfig;
}

const STATUS: Record<string, AttemptStatus> = {
  passed: 'pass',
  failed: 'fail',
  timedOut: 'fail',
  skipped: 'skip',
  interrupted: 'skip',
};

const SEP = '\u0000';

/** Parse a Playwright JSON report into canonical records. Never throws (spec 9.1). */
export function parsePlaywrightReport(text: string, opts: ParseOptions): ImportResult {
  try {
    return parse(text, opts);
  } catch {
    // Last resort: a bug must still surface as a calm notice, never an exception.
    return failed(opts, 'import.fail.unreadable');
  }
}

function failed(opts: ParseOptions, code: NoticeCode, params: Record<string, string | number> = {}): ImportResult {
  return {
    record: {
      importId: hashString(opts.fileName + SEP + opts.importedAt + SEP + code),
      fileName: opts.fileName,
      importedAt: opts.importedAt,
      result: 'failed',
      counts: { found: 0, imported: 0, notImported: 0 },
      notices: [{ code, severity: 'error', params: { file: opts.fileName, ...params } }],
      runIds: [],
    },
    runs: [],
    tests: [],
    attempts: [],
    failures: [],
  };
}

class TooDeep extends Error {}

const errorOf = (r: Record<string, unknown>): { message: string; stack: string } => {
  const e = (r.error ?? (Array.isArray(r.errors) ? r.errors[0] : undefined)) as Record<string, unknown> | undefined;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return { message: str(e?.message), stack: str(e?.stack) };
};

function parse(text: string, opts: ParseOptions): ImportResult {
  const config = opts.config ?? DEFAULT_CONFIG;
  if (text.length > config.maxFileChars) {
    return failed(opts, 'import.fail.tooLarge', { limit: `${Math.round(config.maxFileChars / 1_000_000)} MB` });
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    return failed(opts, 'import.fail.unreadable');
  }
  const report = reportSchema.safeParse(raw);
  if (!report.success) return failed(opts, 'import.fail.format');

  const startedAt = report.data.stats?.startTime ?? null;
  const runId = hashString((startedAt ?? '') + SEP + text);
  const importId = hashString(opts.fileName + SEP + opts.importedAt + SEP + runId);
  const commit = opts.commitLabel?.trim() || null;
  const notices: Notice[] = [];
  if (commit === null) notices.push({ code: 'import.noCommit', severity: 'info', params: { file: opts.fileName } });
  const warn = (code: NoticeCode, params: Record<string, string | number>, location?: Notice['location']) =>
    notices.push({ code, severity: 'warning', params, ...(location ? { location } : {}) });

  const tests: Test[] = [];
  const attempts: Attempt[] = [];
  const failures: Failure[] = [];
  const seenIds = new Set<string>();
  let found = 0;
  let badDurations = 0;
  let dupes = 0;

  const walk = (suiteRaw: unknown, path: string[], topFile: string | undefined, depth: number) => {
    if (depth > config.maxSuiteDepth) throw new TooDeep();
    const suite = suiteSchema.safeParse(suiteRaw);
    if (!suite.success) return;
    const isTop = topFile === undefined;
    const file = topFile ?? suite.data.file ?? suite.data.title ?? '';
    const suitePath = isTop ? path : [...path, suite.data.title ?? ''];
    (suite.data.specs ?? []).forEach((specRaw, specIndex) => {
      const spec = specSchema.safeParse(specRaw);
      if (!spec.success) return;
      const specTests = (spec.data.tests ?? []).map((t) => testSchema.safeParse(t)).filter((t) => t.success);
      const title = typeof spec.data.title === 'string' ? spec.data.title.trim() : '';
      if (title === '') {
        const count = specTests.reduce((n, t) => n + (t.data.results?.length ?? 0), 0);
        found += count;
        if (count > 0)
          warn('import.partial.noName', { count, run: opts.fileName, pos: specIndex + 1 }, { position: specIndex + 1 });
        return;
      }
      const specFile = spec.data.file ?? file;
      for (const t of specTests) {
        const project = t.data.projectName ?? '';
        const testKey = hashString([specFile, ...suitePath, title].join(SEP));
        let testId = hashString([specFile, ...suitePath, title, project].join(SEP));
        if (seenIds.has(testId)) testId = hashString(testId + '#' + ++dupes);
        seenIds.add(testId);
        tests.push({ testId, testKey, file: specFile, suitePath, title, project });
        let noStatus = 0;
        (t.data.results ?? []).forEach((resRaw, index) => {
          found++;
          const res = resultSchema.safeParse(resRaw);
          if (!res.success) {
            noStatus++;
            return;
          }
          const r = res.data as Record<string, unknown>;
          const retryIndex = Number.isInteger(r.retry) && (r.retry as number) >= 0 ? (r.retry as number) : index;
          const status = STATUS[res.data.status]!;
          const d = r.duration;
          const durationMs = typeof d === 'number' && Number.isFinite(d) && d >= 0 ? d : null;
          if (durationMs === null) badDurations++;
          const attemptId = hashString(runId + testId + retryIndex);
          attempts.push({ attemptId, runId, testId, retryIndex, status, durationMs });
          if (status === 'fail') failures.push({ attemptId, ...errorOf(r) });
        });
        if (noStatus > 0)
          warn('import.partial.noStatus', { count: noStatus, test: title, run: opts.fileName }, { test: title });
      }
    });
    for (const child of suite.data.suites ?? []) walk(child, suitePath, file, depth + 1);
  };
  try {
    for (const s of report.data.suites) walk(s, [], undefined, 1);
  } catch (e) {
    if (e instanceof TooDeep)
      return failed(opts, 'import.fail.tooLarge', { limit: `${config.maxSuiteDepth} nested suites` });
    throw e;
  }
  if (badDurations > 0) warn('import.partial.badDuration', { count: badDurations });
  if (dupes > 0) warn('import.dupeIds', { count: dupes });

  const notImported = found - attempts.length;
  if (found > 0 && notImported / found > config.maxBadShare) return failed(opts, 'import.fail.tooBad');

  const run: Run = { runId, importId, commit, startedAt, order: opts.order };
  const partial = notImported > 0 || notices.some((n) => n.severity === 'warning');
  return {
    record: {
      importId,
      fileName: opts.fileName,
      importedAt: opts.importedAt,
      result: partial ? 'partial' : 'success',
      counts: { found, imported: attempts.length, notImported },
      notices,
      runIds: [runId],
    },
    runs: [run],
    tests,
    attempts,
    failures,
  };
}
