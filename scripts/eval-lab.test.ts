import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { scoreTests } from '../src/engine/score/score';
import { labelKey, labelOf, readLabels } from '../flake-lab/labels';
import { buildReport, evaluate, loadLab, prf } from './eval-lab';

const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const manifest: Array<{ file: string; commit: string }> = json('fixtures/lab/manifest.json');
const sampleManifest: Array<{ file: string; commit: string }> = json('public/sample/manifest.json');
const labelEntries = readLabels();
const labels = labelOf(labelEntries);
const flakyCount = Object.values(labels).filter((l) => l === 'flaky').length;

it('labels every lab test as its ground truth says', () => {
  const ds = loadLab(manifest, 'fixtures/lab');
  const byId = new Map(ds.tests.map((t) => [t.testId, labelKey(t.title, t.project)]));
  const scores = scoreTests(ds);
  expect(scores).toHaveLength(Object.keys(labels).length);
  for (const s of scores) {
    const key = byId.get(s.testId)!;
    expect([key, s.label]).toEqual([key, labels[key]]);
  }
});

it('the sample set imports with a not-imported notice and no failed file', () => {
  const ds = loadLab(sampleManifest, 'public/sample');
  expect(ds.imports).toHaveLength(13);
  expect(ds.imports.some((i) => i.result === 'failed')).toBe(false);
  expect(ds.imports.some((i) => i.counts.notImported > 0)).toBe(true);
});

it('prf computes precision, recall and F1, with null when undefined', () => {
  expect(prf(new Set(['a', 'b']), new Set(['a', 'c']))).toEqual({ tp: 1, fp: 1, fn: 1, precision: 0.5, recall: 0.5, f1: 0.5 });
  expect(prf(new Set(), new Set(['a']))).toEqual({ tp: 0, fp: 0, fn: 1, precision: null, recall: 0, f1: null });
  expect(prf(new Set(['a']), new Set(['a']))).toMatchObject({ precision: 1, recall: 1, f1: 1 });
});

it('evaluates engine and Playwright baseline at 4, 8 and 12 runs', () => {
  const rows = evaluate(manifest, 'fixtures/lab', labels);
  expect(rows.map((r) => [r.method, r.runs])).toEqual([
    ['engine', 4], ['engine', 8], ['engine', 12],
    ['baseline', 4], ['baseline', 8], ['baseline', 12],
  ]);
  // The engine finds every flaky lab test at 4, 8 and 12 runs; Playwright's retry flag misses at least the cross-run one.
  for (const r of rows.filter((r) => r.method === 'engine')) expect(r).toMatchObject({ fp: 0, fn: 0, precision: 1, recall: 1 });
  expect(rows.find((r) => r.method === 'engine' && r.runs === 12)!.tp).toBe(flakyCount);
  for (const r of rows.filter((r) => r.method === 'baseline')) expect(r).toMatchObject({ fp: 0, precision: 1 });
  for (const r of rows.filter((r) => r.method === 'baseline')) expect(r.fn).toBeGreaterThanOrEqual(1);
});

it('Playwright never marks the cross-run test flaky', () => {
  for (const { file } of manifest) {
    const raw = readFileSync(`fixtures/lab/${file}`, 'utf8');
    const run = Number(file.slice(4, 6));
    const walk = (s: { suites?: unknown[]; specs?: Array<{ title: string; tests: Array<{ status: string }> }> }): string[] => [
      ...(s.specs ?? []).filter((x) => x.title === 'flaky: cross-run only').flatMap((x) => x.tests.map((t) => t.status)),
      ...(s.suites ?? []).flatMap((c) => walk(c as never)),
    ];
    const statuses = (JSON.parse(raw).suites as never[]).flatMap((s) => walk(s));
    expect(statuses).toEqual([run % 2 === 0 ? 'unexpected' : 'expected']);
  }
});

it('the committed report shows no tie note', () => {
  expect(readFileSync('docs/eval/lab-detection.md', 'utf8')).not.toContain('score the same');
});

it('the report has the table, the baseline and a Limits paragraph', () => {
  const md = buildReport(evaluate(manifest, 'fixtures/lab', labels), { tests: Object.keys(labels).length, flaky: flakyCount });
  expect(md).toMatch(/\| Method \| Runs \| Precision \| Recall \| F1 \|/);
  expect(md.match(/^\| Engine/gm)).toHaveLength(3);
  expect(md.match(/^\| Playwright baseline/gm)).toHaveLength(3);
  expect(md).toContain('Playwright marked the test flaky in any loaded run');
  expect(md).toMatch(/## Limits[\s\S]*synthetic[\s\S]*\d+ tests[\s\S]*one browser engine[\s\S]*not a real-world benchmark/);
});

it('the report says when engine and baseline tie', () => {
  const row = (method: 'engine' | 'baseline', runs: number) => ({ method, runs, tp: 2, fp: 0, fn: 0, precision: 1, recall: 1, f1: 1 });
  const tied = [4, 8, 12].flatMap((n) => [row('engine', n), row('baseline', n)]);
  expect(buildReport(tied)).toContain('score the same');
  expect(buildReport(tied.map((r) => (r.method === 'baseline' ? { ...r, recall: 0.5 } : r)))).not.toContain('score the same');
});
