import 'fake-indexeddb/auto';
import { it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { emptyDataset } from '@/engine/dataset';
import { scoreTests } from '@/engine/score/score';
import type { Dataset } from '@/engine/types';
import { clearAll, loadDataset } from './db';
import { ImportRefused, ImportTimeout, runImport, type Parser } from './importer';
import { MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from './limits';
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

// A File stand-in with a chosen size; text() is a spy so reads can be counted and ordered.
const stub = (name: string, size: number, text = () => Promise.resolve('')) => {
  const read = vi.fn(text);
  return Object.assign({ name, size, text: read }) as unknown as File & { text: ReturnType<typeof vi.fn> };
};

it('limits: 50 MB per file, 200 files, 200 MB per drop', () => {
  expect([MAX_FILE_BYTES, MAX_FILES, MAX_TOTAL_BYTES]).toEqual([50_000_000, 200, 200_000_000]);
});

it('an oversized file is a failed import with import.fail.tooLarge and is never read', async () => {
  const big = stub('big.json', MAX_FILE_BYTES + 1, () => {
    throw new Error('must not be read');
  });
  const r = await run([big]);
  expect(big.text).not.toHaveBeenCalled();
  expect(r.records[0]).toMatchObject({ fileName: 'big.json', result: 'failed' });
  expect(r.records[0]!.notices[0]).toMatchObject({ code: 'import.fail.tooLarge', params: { file: 'big.json', limit: '50 MB' } });
  expect(r.dataset.runs).toHaveLength(0);
});

it('in a mixed drop the oversized file fails in place and the others import', async () => {
  const big = stub('big.json', MAX_FILE_BYTES + 1);
  const r = await run([file('run-00.json'), big, file('run-01.json')]);
  expect(r.records.map((x) => [x.fileName, x.result])).toEqual([
    ['run-00.json', 'success'],
    ['big.json', 'failed'],
    ['run-01.json', 'success'],
  ]);
  expect(r.dataset.runs).toHaveLength(2);
});

it('more than 200 files refuses the whole drop before any file is read', async () => {
  const many = Array.from({ length: MAX_FILES + 1 }, (_, i) => stub(`f${i}.json`, 10));
  await expect(run(many)).rejects.toMatchObject({ name: 'ImportRefused', code: 'import.fail.tooMany', limit: '200' });
  expect(many.every((f) => f.text.mock.calls.length === 0)).toBe(true);
});

it('files that add up to more than 200 MB refuse the whole drop before any file is read', async () => {
  const five = Array.from({ length: 5 }, (_, i) => stub(`f${i}.json`, MAX_FILE_BYTES));
  await expect(run(five)).rejects.toBeInstanceOf(ImportRefused);
  await expect(run(five)).rejects.toMatchObject({ code: 'import.fail.tooBig', limit: '200 MB' });
  expect(five.every((f) => f.text.mock.calls.length === 0)).toBe(true);
});

it('files are read one at a time, in order', async () => {
  let active = 0;
  let peak = 0;
  const order: string[] = [];
  const reading = (name: string) =>
    stub(name, 10, async () => {
      order.push(name);
      peak = Math.max(peak, ++active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return readFileSync('fixtures/lab/run-00.json', 'utf8');
    });
  await run([reading('a.json'), reading('b.json'), reading('c.json')]);
  expect(peak).toBe(1);
  expect(order).toEqual(['a.json', 'b.json', 'c.json']);
});

it('a cancel between two reads stops before the next read', async () => {
  const ctrl = new AbortController();
  const first = stub('a.json', 10, async () => {
    ctrl.abort(new DOMException('Import cancelled', 'AbortError'));
    return '{}';
  });
  const second = stub('b.json', 10);
  await expect(run([first, second], emptyDataset(), { signal: ctrl.signal })).rejects.toMatchObject({ name: 'AbortError' });
  expect(second.text).not.toHaveBeenCalled();
});

// ---- JUnit XML (DEV-43): the worker picks the importer by content ----
const xml = (f: string) => new File([readFileSync(`fixtures/junit/${f}`, 'utf8')], f);

it('a JUnit file, a Playwright file and an unknown file in one drop are each read by the right importer', async () => {
  const r = await run([xml('valid.xml'), file('run-00.json'), xml('wrong-format.xml'), xml('xxe-file.xml')]);
  expect(r.records.map((x) => x.result)).toEqual(['success', 'success', 'failed', 'failed']);
  expect(r.records[2]!.notices.map((n) => n.code)).toEqual(['import.fail.format']);
  expect(r.records[3]!.notices.map((n) => n.code)).toEqual(['import.fail.unsafe']);
  expect(r.dataset.runs).toHaveLength(2);
  const junit = r.dataset.runs.find((x) => x.os === 'Linux')!;
  expect(junit.commit).toBe('a1b2c3d4e5f6a7b8');
  expect(r.dataset.tests.some((t) => t.title === 'rejectsExpiredCoupon' && t.file === 'com.acme.CheckoutTest')).toBe(true);
  expect(scoreTests(r.dataset).length).toBe(r.dataset.tests.length);
});

it('JUnit runs can be saved and loaded again like any other', async () => {
  const r = await run([xml('surefire-rerun.xml')], emptyDataset(), { persist: true });
  expect(await loadDataset()).toEqual(r.dataset);
});
