import { redactSecrets } from '@/engine/group/normalize';
import type { Dataset } from '@/engine/types';
import { t } from '../copy';
import { cleanText, escapeMd, toCsv } from '../lib/safeText';
import { formatMinutes, health, type Row } from './selectors';

// What goes into the files (board 14, DEV-42). Plain functions, so they are tested without a screen.
// Everything that leaves the page is text from the person's own reports: names, paths and counts. No log text and no
// quoted evidence line is ever exported; the free-text cells still pass through redactSecrets, so a token in a test name
// or path is masked (DEV-37 follow-up). Sample data says so inside every file.

export const FILES = { csv: 'flakelens-tests.csv', json: 'flakelens-tests.json', md: 'flakelens-report.md' } as const;
export type Scope = 'view' | 'all';

export interface ExportInput {
  rows: Row[]; // the tests to export, already in the order to write them
  ds: Dataset;
  sample: boolean;
  scope: Scope;
  version: string;
  now: Date;
}

/** Current view is what the tab and the search show; All tests ignores both. */
export const scopeRows = (all: Row[], view: Row[], scope: Scope): Row[] => (scope === 'all' ? all : view);

const text = (s: string) => redactSecrets(cleanText(s));
const testName = (r: Row) => text([...r.test.suitePath, r.test.title].join(' › '));

export const CSV_HEADER = [
  'rank', 'test', 'file', 'project', 'status', 'score', 'mixed commits', 'flip rate', 'attempts', 'wasted minutes', 'evidence', 'first seen', 'last failed',
] as const;

const round = (n: number, digits: number) => Number(n.toFixed(digits));

// One record per test; the CSV and the JSON write the same values.
function records({ rows, ds }: ExportInput) {
  const started = new Map(ds.runs.map((r) => [r.runId, r.startedAt]));
  return rows.map((r) => ({
    rank: r.flakyRank,
    test: testName(r),
    file: text(r.test.file),
    project: text(r.test.project),
    status: t(`status.${r.score.label}`),
    score: round(r.score.score, 1),
    mixedCommits: r.score.mixedCommits,
    commits: r.commits,
    flipRate: round(r.score.flipRate, 2),
    attempts: r.score.attempts,
    runs: r.score.runs,
    retries: r.score.retries,
    wastedMinutes: round(r.score.wastedMs / 60_000, 1),
    possibleWastedMinutes: round(r.score.possibleWastedMs / 60_000, 1),
    evidence: text(t(r.evidence.key, r.evidence.params)),
    firstSeen: started.get(r.score.firstSeenRunId) ?? null,
    lastFailed: r.lastFailedAt,
  }));
}

/** One row per test, in the order given. A sample-data file gets a last column "data" saying "sample data" on every row. */
export function csvFile(input: ExportInput): string {
  const rows = records(input).map((r) => [
    r.rank ?? '', r.test, r.file, r.project, r.status, r.score, r.mixedCommits, r.flipRate, r.attempts, r.wastedMinutes, r.evidence, r.firstSeen ?? '', r.lastFailed ?? '',
  ]);
  if (!input.sample) return toCsv([...CSV_HEADER], rows);
  return toCsv([...CSV_HEADER, 'data'], rows.map((r) => [...r, 'sample data']));
}

/** The canonical export: { app, version, exportedAt, scope, tests }, plus sample: true for sample data. */
export function jsonFile(input: ExportInput): string {
  return JSON.stringify({
    app: 'FlakeLens',
    version: input.version,
    exportedAt: input.now.toISOString(),
    scope: input.scope,
    ...(input.sample ? { sample: true } : {}),
    tests: records(input),
  });
}

// ---- Markdown report ----

/** "12 min", "3 h 12 min"; under a minute one decimal. */
export function formatDuration(ms: number): string {
  if (ms >= 3_600_000) {
    const minutes = Math.round(ms / 60_000);
    return t('report.md.duration', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  }
  return t('report.md.duration.minutes', { minutes: formatMinutes(ms) });
}

const TOP_FLAKY = 10;
const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export interface ReportInput extends ExportInput {
  /** The likely cause of a test (medium or high confidence only), when the classifier has one. */
  causes?: ReadonlyMap<string, { cause: string; level: 'medium' | 'high' }>;
}
export interface ReportModel {
  title: string;
  meta: string;
  sample: string | null;
  summaryTitle: string;
  counts: string;
  wasted: string;
  topTitle: string;
  items: { name: string; detail: string; cause: string | null }[];
  noFlaky: string | null;
  footer: string;
}

/** The report as plain data: the preview draws it, the Markdown is written from it, so the two always agree. */
export function buildReport(input: ReportInput): ReportModel {
  const { rows, ds, scope } = input;
  const h = health(rows);
  const flaky = rows.filter((r) => r.score.label === 'flaky').slice(0, TOP_FLAKY);
  const wanted = new Set(flaky.map((r) => r.score.testId));
  const attempts = new Map<string, { failed: number; total: number }>();
  for (const a of ds.attempts) {
    if (!wanted.has(a.testId) || a.status === 'skip') continue;
    const x = attempts.get(a.testId) ?? { failed: 0, total: 0 };
    x.total++;
    if (a.status === 'fail') x.failed++;
    attempts.set(a.testId, x);
  }
  const files = ds.imports.filter((i) => i.result !== 'failed').length;
  const wasted =
    h.wastedMs > 0 && h.possibleMs > 0
      ? t('report.md.wasted', { flakyTime: formatDuration(h.wastedMs), unprovenTime: formatDuration(h.possibleMs) })
      : h.wastedMs > 0
        ? t('report.md.wasted.flakyOnly', { flakyTime: formatDuration(h.wastedMs) })
        : h.possibleMs > 0
          ? t('report.md.wasted.unprovenOnly', { unprovenTime: formatDuration(h.possibleMs) })
          : t('report.md.wasted.none');
  return {
    title: t('report.md.title'),
    meta: t('report.md.meta', { date: date.format(input.now), files, runs: ds.runs.length, tests: rows.length, scope: t(scope === 'all' ? 'report.md.scope.all' : 'report.md.scope.view') }),
    sample: input.sample ? t('report.sample') : null,
    summaryTitle: t('report.md.summary'),
    counts: t('report.md.counts', { flaky: h.counts.flaky, unproven: h.counts.suspect, failing: h.counts.failing, stable: h.counts.stable, nodata: h.counts.insufficient }),
    wasted,
    topTitle: t('report.md.top'),
    items: flaky.map((r) => {
      const a = attempts.get(r.score.testId) ?? { failed: 0, total: 0 };
      const c = input.causes?.get(r.score.testId);
      return {
        name: testName(r),
        detail: t('report.md.item', { failed: a.failed, total: a.total, commits: r.score.mixedCommits, minutes: formatMinutes(r.score.wastedMs) }),
        cause: c ? t('report.md.cause', { cause: text(c.cause), level: c.level }) : null,
      };
    }),
    noFlaky: flaky.length === 0 ? t('report.noFlaky') : null,
    footer: t('report.md.footer', { version: input.version }),
  };
}

/** The Markdown file. Every piece of text goes through escapeMd. */
export function reportMarkdown(m: ReportModel): string {
  const out = [`# ${escapeMd(m.title)}`, '', escapeMd(m.meta), ''];
  if (m.sample) out.push(escapeMd(m.sample), '');
  out.push(`## ${escapeMd(m.summaryTitle)}`, '', `- ${escapeMd(m.counts)}`, `- ${escapeMd(m.wasted)}`, '', `## ${escapeMd(m.topTitle)}`, '');
  if (m.noFlaky) out.push(escapeMd(m.noFlaky), '');
  m.items.forEach((it, i) => {
    out.push(`${i + 1}. ${escapeMd(it.name)}`, `   ${escapeMd(it.detail)}`);
    if (it.cause) out.push(`   ${escapeMd(it.cause)}`);
  });
  if (m.items.length > 0) out.push('');
  out.push('---', '', escapeMd(m.footer), '');
  return out.join('\n');
}
