import { DEFAULT_CONFIG, type EngineConfig } from '../config';
import { hashString } from '../hash';
import { failedImport } from './failed';
import type { Attempt, AttemptStatus, Failure, ImportResult, Notice, NoticeCode, Run, Test } from '../types';
import { readRunMetadata } from './metadata';
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
    return failedImport(opts, 'import.fail.unreadable');
  }
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
    return failedImport(opts, 'import.fail.tooLarge', { limit: `${Math.round(config.maxFileChars / 1_000_000)} MB` });
  }
  // Strip a UTF-8 BOM before parsing and hashing, so a BOM copy of a report gets the same run ID.
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return failedImport(opts, 'import.fail.unreadable');
  }
  const report = reportSchema.safeParse(raw);
  if (!report.success) return failedImport(opts, 'import.fail.format');

  // An unreadable start time leaves the field empty (spec 9.1); readable ones are normalized to UTC ISO.
  const rawStart = report.data.stats?.startTime;
  const startMs = typeof rawStart === 'string' ? Date.parse(rawStart) : NaN;
  const startedAt = Number.isNaN(startMs) ? null : new Date(startMs).toISOString();
  const runId = hashString((startedAt ?? '') + SEP + body);
  const importId = hashString(opts.fileName + SEP + opts.importedAt + SEP + runId);
  // A typed label wins over the commit in the report; the report's commit is kept so removing the label gives it back.
  const { commit: reportCommit, ...meta } = readRunMetadata(report.data.config);
  const label = opts.commitLabel?.trim() || null;
  const commit = label ?? reportCommit;
  const notices: Notice[] = [];
  if (commit === null) notices.push({ code: 'import.noCommit', severity: 'info', params: { file: opts.fileName } });
  // Present but unreadable: the run keeps its import order; info only, so the import stays a success.
  if (rawStart !== undefined && rawStart !== null && startedAt === null)
    notices.push({ code: 'import.partial.badDate', severity: 'info', params: { file: opts.fileName } });
  const warn = (code: NoticeCode, params: Record<string, string | number>, location?: Notice['location']) =>
    notices.push({ code, severity: 'warning', params, ...(location ? { location } : {}) });

  const tests: Test[] = [];
  const attempts: Attempt[] = [];
  const failures: Failure[] = [];
  const seenIds = new Set<string>();
  const dupeCount = new Map<string, number>();
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
      // Playwright rejects duplicate titles, so several tests for one project in one spec are --repeat-each repeats.
      const repeats = new Map<string, { testId: string; count: number }>();
      for (const t of specTests) {
        const project = t.data.projectName ?? '';
        let repeat = repeats.get(project);
        if (repeat) repeat.count++;
        else {
          const testKey = hashString([specFile, ...suitePath, title].join(SEP));
          const base = hashString([specFile, ...suitePath, title, project].join(SEP));
          let testId = base;
          if (seenIds.has(base)) {
            // Counter per base ID, so one new duplicate elsewhere in the file does not renumber this one.
            const n = (dupeCount.get(base) ?? 0) + 1;
            dupeCount.set(base, n);
            dupes++;
            testId = hashString(base + '#' + n);
          }
          seenIds.add(base);
          tests.push({ testId, testKey, file: specFile, suitePath, title, project });
          repeat = { testId, count: 0 };
          repeats.set(project, repeat);
        }
        const { testId, count: repeatIndex } = repeat;
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
          const attemptId = hashString([runId, testId, repeatIndex, retryIndex].join(SEP));
          attempts.push({ attemptId, runId, testId, repeatIndex, retryIndex, status, durationMs });
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
      return failedImport(opts, 'import.fail.tooLarge', { limit: `${config.maxSuiteDepth} nested suites` });
    throw e;
  }
  if (badDurations > 0) warn('import.partial.badDuration', { count: badDurations });
  if (dupes > 0) warn('import.dupeIds', { count: dupes });

  const notImported = found - attempts.length;
  if (found > 0 && notImported / found > config.maxBadShare) return failedImport(opts, 'import.fail.tooBad');

  const run: Run = { runId, importId, commit, ...(label !== null && reportCommit !== null ? { reportCommit } : {}), ...meta, startedAt, order: opts.order };
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
