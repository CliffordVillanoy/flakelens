import { DEFAULT_CONFIG } from '../config';
import { hashString } from '../hash';
import type { Attempt, AttemptStatus, Failure, ImportResult, Notice, NoticeCode, Run, Test } from '../types';
import { failedImport } from './failed';
import { cleanCommit, cleanMeta } from './metadata';
import type { ParseOptions } from './playwright';
import { XML_MAX_NODES, readXml, type XmlElement } from './xml';

// The JUnit XML importer (DEV-43, spec 9 and 9.1). Same ImportResult and notice codes as the Playwright importer; never throws.
//
// How a report maps (JUnit has no single standard, so the choices are written down here):
//   testcase  one test. classname is the file; a `file` attribute wins, and then the classname joins the suite path.
//             The suite path is the names of the enclosing <testsuite> elements, left out where one equals the classname
//             (Surefire names a suite after its class). `name` is the title. Test.project is '' (JUnit has none).
//   time      seconds, so durationMs = time x 1000. Missing, negative or unreadable: kept without a duration, with a notice.
//   attempts  failure, error     a failed attempt (message attribute or type, the element text as the stack)
//             skipped            a skip
//             no child           a pass
//             Surefire rerun elements are attempts in document order: flakyFailure and flakyError are failed attempts
//             followed by the final pass; rerunFailure and rerunError are failed retries after the first failure.
//             A flaky/rerun attempt's own `time` attribute is its duration; a <stackTrace> child is its stack.
//   metadata  from <properties>, the first value found for each of: git.commit (hex, 7 to 64 characters),
//             git.branch, os.name, browser. Everything else (java.version, ...) is ignored. No git.commit: the run has no
//             commit and the no-commit notice shows. A `timestamp` on a suite is the start time (no zone means UTC);
//             the earliest one is used.
//
// Safety: text is read by xml.ts, which has no document-type or entity support (see there). Everything in the file is data:
// names, messages and stacks are kept as text and are masked where they are shown or exported, as for Playwright reports.

const SEP = '\u0000';
const PROPS_SCANNED = 1000;
const NODES_LIMIT = `${XML_MAX_NODES / 1_000_000} million elements`;

/** Parse a JUnit XML report into canonical records. Never throws (spec 9.1). */
export function parseJUnitReport(text: string, opts: ParseOptions): ImportResult {
  try {
    return parse(text, opts);
  } catch {
    return failedImport(opts, 'import.fail.unreadable');
  }
}

class TooDeep extends Error {}

const FAILED = new Set(['failure', 'error', 'flakyFailure', 'flakyError', 'rerunFailure', 'rerunError']);
const FINAL_FAILED = new Set(['failure', 'error', 'rerunFailure', 'rerunError']);
const FLAKY = new Set(['flakyFailure', 'flakyError']);

const seconds = (raw: string | undefined): number | null => {
  if (raw === undefined || raw.length > 40 || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) : null;
};

// A time with no zone ("2026-11-20T10:00:00") is read as UTC, so the same file gives the same run on every machine.
const NO_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/;
const timestamp = (raw: string): number => {
  const s = raw.trim();
  return s.length > 40 ? NaN : Date.parse(NO_ZONE.test(s) ? s + 'Z' : s);
};

function parse(text: string, opts: ParseOptions): ImportResult {
  const config = opts.config ?? DEFAULT_CONFIG;
  if (text.length > config.maxFileChars) {
    return failedImport(opts, 'import.fail.tooLarge', { limit: `${Math.round(config.maxFileChars / 1_000_000)} MB` });
  }
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const xml = readXml(body, { maxDepth: config.maxSuiteDepth + 6 });
  if (!xml.ok) {
    switch (xml.reason) {
      case 'unsafe':
        return failedImport(opts, 'import.fail.unsafe');
      case 'tooDeep':
        return failedImport(opts, 'import.fail.tooLarge', { limit: `${config.maxSuiteDepth} nested suites` });
      case 'tooLarge':
        return failedImport(opts, 'import.fail.tooLarge', { limit: NODES_LIMIT });
      default:
        return failedImport(opts, 'import.fail.unreadable');
    }
  }
  const root = xml.root;
  if (root.name !== 'testsuites' && root.name !== 'testsuite') return failedImport(opts, 'import.fail.format');

  const notices: Notice[] = [];
  const warn = (code: NoticeCode, params: Record<string, string | number>, location?: Notice['location']) =>
    notices.push({ code, severity: 'warning', params, ...(location ? { location } : {}) });

  const tests: Test[] = [];
  const attempts: Attempt[] = [];
  const failures: Failure[] = [];
  const found = { n: 0 };
  let badDurations = 0;
  let dupes = 0;
  let position = 0;
  const stamps: string[] = [];
  const props = new Map<string, string>();
  let propsSeen = 0;
  const readProperties = (el: XmlElement) => {
    for (const block of el.children) {
      if (block.name !== 'properties') continue;
      for (const p of block.children) {
        if (p.name !== 'property' || ++propsSeen > PROPS_SCANNED) continue;
        const name = p.attrs.name;
        if (name !== undefined && (name === 'git.commit' || name === 'git.branch' || name === 'os.name' || name === 'browser') && !props.has(name)) {
          props.set(name, p.attrs.value ?? p.text);
        }
      }
    }
  };

  // The run id and the test ids need the run id, which needs the start time: read the suites' timestamps first.
  const scan = (el: XmlElement) => {
    if (el.attrs.timestamp !== undefined) stamps.push(el.attrs.timestamp);
    readProperties(el);
    for (const c of el.children) if (c.name === 'testsuite') scan(c);
  };
  scan(root);

  let startedAt: string | null = null;
  for (const s of stamps) {
    const ms = timestamp(s);
    if (!Number.isNaN(ms) && (startedAt === null || ms < Date.parse(startedAt))) startedAt = new Date(ms).toISOString();
  }
  const runId = hashString((startedAt ?? '') + SEP + body);
  const importId = hashString(opts.fileName + SEP + opts.importedAt + SEP + runId);
  const reportCommit = cleanCommit(props.get('git.commit'));
  const label = opts.commitLabel?.trim() || null;
  const commit = label ?? reportCommit;
  if (commit === null) notices.push({ code: 'import.noCommit', severity: 'info', params: { file: opts.fileName } });
  if (stamps.length > 0 && startedAt === null) notices.push({ code: 'import.partial.badDate', severity: 'info', params: { file: opts.fileName } });

  const seenIds = new Set<string>();
  const dupeCount = new Map<string, number>();

  const handleCase = (el: XmlElement, path: string[]) => {
    position++;
    const title = (el.attrs.name ?? '').trim();
    const classname = (el.attrs.classname ?? '').trim();
    const fileAttr = (el.attrs.file ?? '').trim();

    // The attempts, in document order.
    const seq: { status: AttemptStatus; ms: number | null; message: string; stack: string; own: boolean }[] = [];
    let skipped = false;
    let finalFailed = false;
    let flaky = false;
    const caseMs = seconds(el.attrs.time);
    for (const child of el.children) {
      if (FAILED.has(child.name)) {
        if (FINAL_FAILED.has(child.name)) finalFailed = true;
        if (FLAKY.has(child.name)) flaky = true;
        const trace = child.children.find((c) => c.name === 'stackTrace');
        const own = child.name !== 'failure' && child.name !== 'error';
        seq.push({
          status: 'fail',
          ms: own ? seconds(child.attrs.time) : caseMs,
          message: child.attrs.message ?? child.attrs.type ?? '',
          stack: (trace ? trace.text : child.text).trim(),
          own,
        });
      } else if (child.name === 'skipped') skipped = true;
    }
    if (seq.length === 0) seq.push({ status: skipped ? 'skip' : 'pass', ms: caseMs, message: '', stack: '', own: false });
    else if (!finalFailed && (flaky || !skipped)) seq.push({ status: 'pass', ms: caseMs, message: '', stack: '', own: false });

    found.n += seq.length;
    if (title === '') {
      warn('import.partial.noName', { count: seq.length, run: opts.fileName, pos: position }, { position });
      return;
    }
    if (caseMs === null) badDurations++;

    const file = fileAttr || classname;
    const base = path.filter((p) => p !== '' && p !== classname);
    const suitePath = fileAttr && classname && classname !== fileAttr ? [...base, classname] : base;
    const testKey = hashString([file, ...suitePath, title].join(SEP));
    const baseId = hashString([file, ...suitePath, title, ''].join(SEP));
    let testId = baseId;
    if (seenIds.has(baseId)) {
      const n = (dupeCount.get(baseId) ?? 0) + 1;
      dupeCount.set(baseId, n);
      dupes++;
      testId = hashString(baseId + '#' + n);
    }
    seenIds.add(baseId);
    tests.push({ testId, testKey, file, suitePath, title, project: '' });
    seq.forEach((a, retryIndex) => {
      const attemptId = hashString([runId, testId, 0, retryIndex].join(SEP));
      attempts.push({ attemptId, runId, testId, repeatIndex: 0, retryIndex, status: a.status, durationMs: a.ms });
      if (a.status === 'fail') failures.push({ attemptId, message: a.message, stack: a.stack });
    });
  };

  const walk = (el: XmlElement, path: string[], depth: number) => {
    if (el.name === 'testsuite' && depth + 1 > config.maxSuiteDepth) throw new TooDeep();
    const here = el.name === 'testsuite' ? [...path, (el.attrs.name ?? '').trim()] : path;
    for (const c of el.children) {
      if (c.name === 'testcase') handleCase(c, here);
      else if (c.name === 'testsuite') walk(c, here, depth + (el.name === 'testsuite' ? 1 : 0));
    }
  };
  try {
    if (root.name === 'testsuite') {
      // a bare <testsuite> root is the first suite: its own cases and nested suites
      walk(root, [], 0);
    } else {
      for (const s of root.children) if (s.name === 'testsuite') walk(s, [], 0);
    }
  } catch (e) {
    if (e instanceof TooDeep) return failedImport(opts, 'import.fail.tooLarge', { limit: `${config.maxSuiteDepth} nested suites` });
    throw e;
  }
  if (badDurations > 0) warn('import.partial.badDuration', { count: badDurations });
  if (dupes > 0) warn('import.dupeIds', { count: dupes });

  const notImported = found.n - attempts.length;
  if (found.n > 0 && notImported / found.n > config.maxBadShare) return failedImport(opts, 'import.fail.tooBad');

  const run: Run = {
    runId,
    importId,
    commit,
    ...(label !== null && reportCommit !== null ? { reportCommit } : {}),
    branch: cleanMeta(props.get('git.branch')),
    browser: cleanMeta(props.get('browser')),
    shard: null,
    os: cleanMeta(props.get('os.name')),
    startedAt,
    order: opts.order,
  };
  const partial = notImported > 0 || notices.some((n) => n.severity === 'warning');
  return {
    record: {
      importId,
      fileName: opts.fileName,
      importedAt: opts.importedAt,
      result: partial ? 'partial' : 'success',
      counts: { found: found.n, imported: attempts.length, notImported },
      notices,
      runIds: [runId],
    },
    runs: [run],
    tests,
    attempts,
    failures,
  };
}
