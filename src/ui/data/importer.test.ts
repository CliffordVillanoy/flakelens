import 'fake-indexeddb/auto';
import { it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { emptyDataset } from '@/engine/dataset';
import { scoreTests } from '@/engine/score/score';
import type { Dataset } from '@/engine/types';
import { clearAll, loadDataset } from './db';
import { ImportTimeout, runImport, type Parser } from './importer';
import { parseFiles } from './worker';

const file = (f: string) => new File([readFileSync(`fixtures/lab/${f}`, 'utf8')], f);
const direct = (): Parser => ({ parseFiles: async (files, at, cb) => parseFiles(files, at, cb), terminate: () => {} });
const hanging = (terminate: () => void): Parser => ({ parseFiles: () => new Promise(() => {}), terminate });
const run = (files: File[], dataset: Dataset = emptyDataset(), extra: Partial<Parameters<typeof runImport>[1]> = {}) =>
  runImport(files, { dataset, persist: false, signal: new AbortController().signal, parser: direct, ...extra });

beforeEach(() => clearAll());

it('the same file twice in one drop keeps one run and adds import.dupeRun', async () => {
  const r = await run([file('run-00.json'), file('run-00.json')]);
  expect(r.dataset.runs).toHaveLength(1);
  expect(r.dataset.imports).toHaveLength(2);
  expect(new Set(r.dataset.imports.map((i) => i.importId)).size).toBe(2);
  expect(r.records[1]!.notices.map((n) => n.code)).toContain('import.dupeRun');
});

it('runs keep import order across drops', async () => {
  const first = await run([file('run-00.json'), file('run-01.json')]);
  const second = await run([file('run-02.json')], first.dataset);
  expect(second.dataset.runs.map((r) => r.order)).toEqual([0, 1, 2]);
});

it('persists only when asked', async () => {
  await run([file('run-00.json')]);
  expect((await loadDataset()).imports).toHaveLength(0);
  const r = await run([file('run-00.json')], emptyDataset(), { persist: true });
  expect(await loadDataset()).toEqual(r.dataset);
});

it('abort terminates the worker and leaves the dataset unchanged', async () => {
  const before = (await run([file('run-00.json')])).dataset;
  const snapshot = structuredClone(before);
  const ac = new AbortController();
  const terminate = vi.fn();
  // Abort while the worker is parsing.
  const parser = (): Parser => ({ parseFiles: () => (queueMicrotask(() => ac.abort()), new Promise(() => {})), terminate });
  const p = runImport([file('run-01.json')], { dataset: before, persist: true, signal: ac.signal, parser });
  await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  expect(terminate).toHaveBeenCalled();
  expect(before).toEqual(snapshot);
  expect((await loadDataset()).imports).toHaveLength(0);
});

it('a file that takes longer than the limit times out and terminates the worker', async () => {
  const terminate = vi.fn();
  await expect(run([file('run-00.json')], emptyDataset(), { parser: () => hanging(terminate), timeoutMs: 20 })).rejects.toBeInstanceOf(
    ImportTimeout,
  );
  expect(terminate).toHaveBeenCalled();
});

it('newFlaky counts tests that became Flaky since the last dataset', async () => {
  const labels = { 'run-00.json': 'c0', 'run-01.json': 'c0' };
  const first = await run([file('run-00.json')], emptyDataset(), { commitLabels: labels });
  expect(first.newFlaky).toBe(0); // nothing to compare against on the first import
  const second = await run([file('run-01.json')], first.dataset, { commitLabels: labels });
  const flaky = (ds: Dataset) => new Set(scoreTests(ds).filter((s) => s.label === 'flaky').map((s) => s.testId));
  const before = flaky(first.dataset);
  const expected = [...flaky(second.dataset)].filter((id) => !before.has(id)).length;
  expect(expected).toBeGreaterThan(0); // "flaky: cross-run only" turns Flaky once c0 has a pass and a fail
  expect(second.newFlaky).toBe(expected);
});

it('an abort after parsing but before saving leaves the dataset and the database unchanged', async () => {
  const ctrl = new AbortController();
  const parser = (): Parser => ({
    parseFiles: async (files, at, cb) => parseFiles(files, at, cb),
    terminate: () => ctrl.abort(new DOMException('Import cancelled', 'AbortError')), // runs right after parsing resolves
  });
  await expect(
    runImport([file('run-00.json')], { dataset: emptyDataset(), persist: true, signal: ctrl.signal, parser }),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect((await loadDataset()).imports).toHaveLength(0);
});
