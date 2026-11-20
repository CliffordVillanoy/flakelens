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

function parse(text: string, opts: ParseOptions): ImportResult {
  const config = opts.config ?? DEFAULT_CONFIG;
  void config;
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

  const tests: Test[] = [];
  const attempts: Attempt[] = [];
  const failures: Failure[] = [];
  let found = 0;

  const walk = (suiteRaw: unknown, path: string[], topFile: string | undefined) => {
    const suite = suiteSchema.safeParse(suiteRaw);
    if (!suite.success) return;
    const isTop = topFile === undefined;
    const file = topFile ?? suite.data.file ?? suite.data.title ?? '';
    const suitePath = isTop ? path : [...path, suite.data.title ?? ''];
    for (const specRaw of suite.data.specs ?? []) {
      const spec = specSchema.safeParse(specRaw);
      if (!spec.success) continue;
      const title = typeof spec.data.title === 'string' ? spec.data.title : '';
      const specFile = spec.data.file ?? file;
      for (const testRaw of spec.data.tests ?? []) {
        const t = testSchema.safeParse(testRaw);
        if (!t.success) continue;
        const project = t.data.projectName ?? '';
        const testKey = hashString([specFile, ...suitePath, title].join(SEP));
        const testId = hashString([specFile, ...suitePath, title, project].join(SEP));
        tests.push({ testId, testKey, file: specFile, suitePath, title, project });
        (t.data.results ?? []).forEach((resRaw, index) => {
          found++;
          const res = resultSchema.safeParse(resRaw);
          if (!res.success) return;
          const retryIndex = res.data.retry ?? index;
          const status = STATUS[res.data.status]!;
          const d = res.data.duration;
          const durationMs = typeof d === 'number' && Number.isFinite(d) && d >= 0 ? d : null;
          const attemptId = hashString(runId + testId + retryIndex);
          attempts.push({ attemptId, runId, testId, retryIndex, status, durationMs });
          if (status === 'fail') {
            const err = res.data.error ?? res.data.errors?.[0];
            failures.push({ attemptId, message: err?.message ?? '', stack: err?.stack ?? '' });
          }
        });
      }
    }
    for (const child of suite.data.suites ?? []) walk(child, suitePath, file);
  };
  for (const s of report.data.suites) walk(s, [], undefined);

  const run: Run = { runId, importId, commit, startedAt, order: opts.order };
  return {
    record: {
      importId,
      fileName: opts.fileName,
      importedAt: opts.importedAt,
      result: 'success',
      counts: { found, imported: attempts.length, notImported: found - attempts.length },
      notices,
      runIds: [runId],
    },
    runs: [run],
    tests,
    attempts,
    failures,
  };
}
