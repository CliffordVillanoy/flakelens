// Pure view models for the Loaded data screen and the not-imported downloads.
import type { Dataset, ImportOutcome, ImportRecord, Notice } from '@/engine/types';
import { orderRuns } from '@/engine/view';
import { t, type CopyKey } from '../copy';
import { cleanText, toCsv } from '../lib/safeText';
import type { Row } from './selectors';

const SEVERITY = ['error', 'warning', 'info'] as const;

// Which tests each run contains: the "Tests" columns count distinct tests, not attempts.
function testsByRun(ds: Dataset): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const a of ds.attempts) {
    const set = out.get(a.runId);
    if (set) set.add(a.testId);
    else out.set(a.runId, new Set([a.testId]));
  }
  return out;
}

export function loadedSummary(ds: Dataset) {
  return {
    files: ds.imports.length,
    runs: ds.runs.length,
    // ISO strings sort as text.
    lastAdded: ds.imports.reduce<string | null>((m, i) => (m === null || i.importedAt > m ? i.importedAt : m), null),
    notImported: ds.imports.reduce((n, i) => n + i.counts.notImported, 0),
  };
}

export interface FileRow {
  importId: string;
  fileName: string;
  importedAt: string;
  result: ImportOutcome;
  runs: number;
  tests: number;
  notImported: number;
}

export function fileRows(ds: Dataset): FileRow[] {
  const byRun = testsByRun(ds);
  return ds.imports.map((r) => {
    const tests = new Set<string>();
    for (const runId of r.runIds) byRun.get(runId)?.forEach((id) => tests.add(id));
    return {
      importId: r.importId,
      fileName: r.fileName,
      importedAt: r.importedAt,
      result: r.result,
      runs: r.runIds.length,
      tests: tests.size,
      notImported: r.counts.notImported,
    };
  });
}

export interface NoticeRow {
  file: string;
  severity: Notice['severity'];
  code: Notice['code'];
  text: string;
}

const noticeText = (n: Notice) => {
  try {
    return t(n.code as CopyKey, n.params);
  } catch {
    return n.code; // a notice whose copy needs a value it did not get must still be listed
  }
};

/** Every notice of every file: problems first, then information; each group keeps import order. */
export function noticeRows(ds: Dataset): NoticeRow[] {
  const rows = ds.imports.flatMap((r) => r.notices.map((n) => ({ file: r.fileName, severity: n.severity, code: n.code, text: noticeText(n) })));
  return SEVERITY.flatMap((s) => rows.filter((r) => r.severity === s));
}

export interface NotImportedRow {
  file: string;
  reason: string;
  test: string;
  run: string;
  position: string;
  count: number;
}

const NOT_IMPORTED_CODES: Notice['code'][] = ['import.partial.noStatus', 'import.partial.noName'];

/** One row per notice about results that were left out; `count` says how many results the row stands for. */
export function notImportedRows(records: ImportRecord[]): NotImportedRow[] {
  return records.flatMap((r) =>
    r.notices
      .filter((n) => NOT_IMPORTED_CODES.includes(n.code))
      .map((n) => ({
        file: cleanText(r.fileName),
        reason: cleanText(noticeText(n)),
        test: cleanText(String(n.params.test ?? '')),
        run: cleanText(String(n.params.run ?? '')),
        position: cleanText(String(n.params.pos ?? '')),
        count: Number(n.params.count ?? 1),
      })),
  );
}

const COLUMNS = ['file', 'reason', 'test', 'run', 'position', 'count'] as const;

export const notImportedCsv = (records: ImportRecord[]) =>
  toCsv([...COLUMNS], notImportedRows(records).map((r) => COLUMNS.map((c) => r[c])));

export const notImportedJson = (records: ImportRecord[]) => JSON.stringify(notImportedRows(records), null, 2);

export interface RunRow {
  number: number; // position in chronological order, the same numbering the test panel uses
  runId: string;
  commit: string;
  branch: string;
  browser: string;
  time: string | null;
  tests: number;
}

/** Newest first. Branch and browser are not read from reports in v0, so they show a dash and nothing is invented. */
export function runRows(ds: Dataset): RunRow[] {
  const byRun = testsByRun(ds);
  const dash = t('wasted.none');
  return orderRuns(ds.runs)
    .map((run, i) => ({
      number: i + 1,
      runId: run.runId,
      commit: run.commit ? run.commit.slice(0, 7) : dash,
      branch: dash,
      browser: dash,
      time: run.startedAt,
      tests: byRun.get(run.runId)?.size ?? 0,
    }))
    .reverse();
}

// ---- "Did you mean": one word from the loaded test and file names, for a search that found nothing ----------

const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);

function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length]!;
}

const MAX_TYPO = 2;

export function suggestSearch(rows: Row[], query: string): string | null {
  const q = query.trim().toLowerCase();
  if (q.length < 3 || /\s/.test(q)) return null;
  const vocabulary = new Set(rows.flatMap((r) => [...words(r.test.title), ...r.test.suitePath.flatMap(words), ...words(r.test.file)]));
  if (vocabulary.has(q)) return null;
  let best: string | null = null;
  let bestDistance = MAX_TYPO + 1;
  for (const w of vocabulary) {
    if (Math.abs(w.length - q.length) > MAX_TYPO) continue;
    const d = distance(q, w);
    if (d < bestDistance) {
      best = w;
      bestDistance = d;
    }
  }
  return best;
}
