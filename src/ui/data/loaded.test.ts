import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { addImport, emptyDataset } from '@/engine/dataset';
import { parsePlaywrightReport } from '@/engine/import/playwright';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import type { Dataset } from '@/engine/types';
import { fileRows, loadedSummary, noticeRows, notImportedCsv, notImportedJson, notImportedRows, runRows, suggestSearch } from './loaded';
import { tableRows } from './selectors';

const pw = (f: string) => readFileSync(`fixtures/playwright/${f}`, 'utf8');
const lab = (f: string) => readFileSync(`fixtures/lab/${f}`, 'utf8');
const AT = '2026-11-20T10:00:00.000Z';
const add = (ds: Dataset, name: string, text: string, order: number, commit?: string) =>
  addImport(ds, parsePlaywrightReport(text, { fileName: name, importedAt: AT, order, commitLabel: commit }));

const loaded = () => {
  let ds = emptyDataset();
  ds = add(ds, 'ok.json', lab('run-00.json'), 0, 'c0');
  ds = add(ds, 'no-status.json', pw('partial-no-status.json'), 1, 'c1');
  ds = add(ds, 'no-name.json', pw('partial-no-name.json'), 2, 'c2');
  ds = add(ds, 'wrong.json', pw('wrong-format.json'), 3);
  return ds;
};

it('summary: files, runs, last added and not imported', () => {
  const s = loadedSummary(loaded());
  expect(s).toMatchObject({ files: 4, runs: 3, notImported: 2 });
  expect(s.lastAdded).toBe(AT);
  expect(loadedSummary(emptyDataset()).lastAdded).toBeNull();
});

it('file rows: counts per file, the result, and failed files listed too', () => {
  const rows = fileRows(loaded());
  expect(rows.map((r) => [r.fileName, r.result])).toEqual([
    ['ok.json', 'success'],
    ['no-status.json', 'partial'],
    ['no-name.json', 'partial'],
    ['wrong.json', 'failed'],
  ]);
  expect(rows[0]).toMatchObject({ runs: 1, tests: 21, notImported: 0 });
  expect(rows[1]).toMatchObject({ runs: 1, notImported: 1 });
  expect(rows[3]).toMatchObject({ runs: 0, tests: 0 });
});

it('notice rows: every notice with its text and file, problems before information', () => {
  const rows = noticeRows(loaded());
  expect(rows[0]!.severity).not.toBe('info');
  expect(rows.some((r) => r.text === '1 result had no status: "adds item" (run no-status.json)' && r.file === 'no-status.json')).toBe(true);
  expect(rows.some((r) => r.text.startsWith("wrong.json wasn't imported"))).toBe(true);
  const sev = rows.map((r) => ['error', 'warning', 'info'].indexOf(r.severity));
  expect(sev).toEqual([...sev].sort((a, b) => a - b));
});

it('not-imported list: one row per not-imported notice, with test, run, position and count', () => {
  const rows = notImportedRows(loaded().imports);
  expect(rows).toEqual([
    { file: 'no-status.json', reason: '1 result had no status: "adds item" (run no-status.json)', test: 'adds item', run: 'no-status.json', position: '', count: 1 },
    { file: 'no-name.json', reason: '1 test had no name (run no-name.json, position 3)', test: '', run: 'no-name.json', position: '3', count: 1 },
  ]);
});

it('CSV and JSON list every not-imported result, with the same cleaned values', () => {
  const imports = loaded().imports;
  const csv = notImportedCsv(imports).split('\r\n');
  expect(csv).toHaveLength(3);
  expect(csv[0]).toContain('file,reason,test,run,position,count');
  const json = JSON.parse(notImportedJson(imports)) as Record<string, unknown>[];
  expect(json).toHaveLength(2);
  expect(json[0]).toMatchObject({ file: 'no-status.json', test: 'adds item', count: 1 });
});

it('hostile names stay formula-safe in the CSV', () => {
  const report = (title: string) =>
    JSON.stringify({
      config: {},
      suites: [
        {
          title: 'a.spec.ts',
          file: 'a.spec.ts',
          specs: [
            { title, tests: [{ projectName: 'c', results: [{ retry: 0 }, { status: 'passed', retry: 1 }] }] },
            { title: 'fine', tests: [{ projectName: 'c', results: [{ status: 'passed', retry: 0 }] }] },
          ],
        },
      ],
    });
  let ds = emptyDataset();
  ds = add(ds, 'a.json', report('=HYPERLINK("http://x")\n2'), 0);
  ds = add(ds, 'b.json', report('a, "b"'), 1);
  const csv = notImportedCsv(ds.imports);
  expect(csv).toContain(`"'=HYPERLINK(""http://x"") 2"`);
  expect(csv).toContain(`"a, ""b"""`);
  expect(csv.split('\r\n')).toHaveLength(3); // the newline in the name did not add a row
});

it('run rows: newest first, number, short commit, dashes for what the report does not hold, tests per run', () => {
  const rows = runRows(loaded());
  expect(rows.map((r) => r.number)).toEqual([3, 2, 1]);
  const first = rows.find((r) => r.commit === 'c0')!;
  expect(first).toMatchObject({ branch: '—', browser: 'chromium', shard: '—', tests: 21 }); // the lab report names its browser, nothing else
  expect(rows.filter((r) => r !== first).every((r) => r.branch === '—' && r.browser === '—' && r.shard === '—')).toBe(true); // reports with no config
  expect(rows.every((r) => r.branch === '—' && r.shard === '—')).toBe(true);
});

it('run rows show branch, browser and shard from the report, the commit as 7 characters, and a dash where the report has nothing', () => {
  const real = (f: string) => readFileSync(`fixtures/playwright/real/${f}.json`, 'utf8');
  let ds = add(emptyDataset(), 'git.json', real('git-two-projects'), 0);
  ds = add(ds, 'shard.json', real('shard-2-of-2'), 1);
  ds = add(ds, 'plain.json', real('no-git'), 2);
  const rows = runRows(ds);
  const git = rows.find((r) => r.branch !== '—' && r.shard === '—')!;
  const shard = rows.find((r) => r.shard !== '—')!;
  const plain = rows.find((r) => r.branch === '—')!;
  expect(git).toMatchObject({ branch: 'feat/dev-39-run-metadata', browser: 'chromium', shard: '—' });
  expect(git.commit).toMatch(/^[0-9a-f]{7}$/);
  expect(shard).toMatchObject({ shard: '2 of 2' });
  expect(plain).toMatchObject({ commit: '—', branch: '—', browser: 'chromium', shard: '—' });
});

it('a typed label shows in full and wins over the commit in the report', () => {
  const real = readFileSync('fixtures/playwright/real/git-two-projects.json', 'utf8');
  const [row] = runRows(add(emptyDataset(), 'git.json', real, 0, 'release-candidate-1'));
  expect(row).toMatchObject({ commit: 'release-candidate-1', labelled: true });
});

it('suggests a close word from test and file names for a misspelt search', () => {
  const ds = add(emptyDataset(), 'a.json', lab('run-00.json'), 0, 'c0');
  const rows = tableRows(ds, rankTests(scoreTests(ds), ds.tests));
  expect(suggestSearch(rows, 'timng')).toBe('timing');
  expect(suggestSearch(rows, 'timing')).toBeNull(); // an exact word needs no suggestion
  expect(suggestSearch(rows, 'zzzzzzzz')).toBeNull();
  expect(suggestSearch(rows, 'ab')).toBeNull(); // too short to guess
});
