import 'fake-indexeddb/auto';
import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dexie from 'dexie';
import { emptyDataset } from '@/engine/dataset';
import { clearAll as clearDb, loadDataset } from '../data/db';
import { parseFiles } from '../data/worker';
import { useStore } from '../data/store';
import { notImportedCsv } from '../data/loaded';
import { reload } from '../lib/reload';
import { setPref } from '../lib/prefs';
import { App } from '../App';

const flags = vi.hoisted(() => ({ failLoad: false }));
vi.mock('../data/parser', () => ({
  workerParser: () => ({ parseFiles: async (...a: Parameters<typeof parseFiles>) => parseFiles(...a), terminate: () => {} }),
}));
vi.mock('../data/db', async (original) => {
  const real = await original<typeof import('../data/db')>();
  return { ...real, loadStored: () => (flags.failLoad ? Promise.reject(new Error('unreadable')) : real.loadStored()) };
});

const pw = (f: string) => new File([readFileSync(`fixtures/playwright/${f}`, 'utf8')], f);
const lab = (f: string) => new File([readFileSync(`fixtures/lab/${f}`, 'utf8')], f);
const json = (name: string, specs: unknown[], startTime = '2026-11-01T10:00:00.000Z') =>
  new File([JSON.stringify({ config: {}, stats: { startTime }, suites: [{ title: 'a.spec.ts', file: 'a.spec.ts', specs }] })], name);
const spec = (title: string) => ({ title, tests: [{ projectName: 'c', results: [{ status: 'passed', retry: 0, duration: 5 }] }] });

const initial = useStore.getState();
const labels = { 'ok.json': 'c0', 'no-status.json': 'c1', 'no-name.json': 'c2' };
const files = () => [
  new File([readFileSync('fixtures/lab/run-00.json', 'utf8')], 'ok.json'),
  new File([readFileSync('fixtures/playwright/partial-no-status.json', 'utf8')], 'no-status.json'),
  new File([readFileSync('fixtures/playwright/partial-no-name.json', 'utf8')], 'no-name.json'),
  pw('wrong-format.json'),
];
const withData = async (fs: File[] = files()) => {
  await useStore.getState().restore();
  await useStore.getState().importFiles(fs, labels);
};
const open = async (hash: string, fs?: File[]) => {
  await withData(fs);
  window.location.hash = hash;
  render(<App />);
};

const blobs: Blob[] = [];
const downloads: string[] = [];
beforeEach(async () => {
  flags.failLoad = false;
  blobs.length = 0;
  downloads.length = 0;
  await clearDb();
  useStore.setState(initial, true);
  window.location.hash = '#/';
  window.URL.createObjectURL = (b: Blob | MediaSource) => (blobs.push(b as Blob), 'blob:test');
  window.URL.revokeObjectURL = () => {};
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
  vi.stubGlobal('fetch', async (url: string) => new Response(readFileSync(`public/${url}`, 'utf8')));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const text = (b: Blob) =>
  new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.readAsText(b);
  });

it('Loaded data lists the files with their result, the notices and the runs table', async () => {
  await open('#/data');
  expect(await screen.findByRole('heading', { level: 1, name: 'Loaded data' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to tests' })).toHaveAttribute('href', '#/tests');
  expect(screen.getByText(/^4 files · 3 runs · last added \d/)).toBeInTheDocument();
  expect(screen.queryByText(/Rankings use only these files/)).toBeNull(); // the lead is the summary line alone
  expect(screen.getByText(/^4 files · 3 runs · last added [^.]*$/)).toBeInTheDocument(); // and has no final period

  const files = screen.getByRole('region', { name: 'Files · 4' });
  const rows = within(files).getAllByRole('listitem');
  expect(rows).toHaveLength(4);
  expect(rows[0]).toHaveTextContent('ok.json');
  expect(rows[0]).toHaveTextContent('Imported');
  expect(rows[1]).toHaveTextContent('no-status.json');
  // The sub-line is only "{runs} runs · {tests} tests": no added date, no "not imported" (the pill says it).
  expect(within(rows[0]!).getByText(/^[0-9]+ runs? · [0-9]+ tests?$/)).toBeInTheDocument();
  expect(rows[1]).not.toHaveTextContent('not imported');
  expect(rows[0]).not.toHaveTextContent('Added');
  expect(rows[1]).toHaveTextContent('Partly imported');
  expect(rows[3]).toHaveTextContent('wrong-format.json');
  expect(rows[3]).toHaveTextContent("Couldn't import");

  const notices = screen.getByRole('region', { name: /^Notices · \d+$/ });
  expect(notices).toHaveTextContent('1 result had no status: "adds item" (run no-status.json)');
  expect(notices).toHaveTextContent("wrong-format.json wasn't imported. It isn't a Playwright JSON report.");

  const table = screen.getByRole('table', { name: 'Runs' });
  const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent);
  expect(headers).toEqual(['Run', 'Commit', 'Branch', 'Browser', 'Time', 'Tests']);
  const first = within(table).getAllByRole('row')[1]!;
  const cells = within(first).getAllByRole('cell').map((c) => c.textContent);
  expect(cells[2]).toBe('—'); // branch is not read from reports in v0
  expect(cells[3]).toBe('—'); // browser too
  expect(screen.getByRole('heading', { name: 'Runs · 3' })).toBeInTheDocument();
});

it('the runs table shows the newest 5 and "Show all N runs" shows the rest', async () => {
  const many = Array.from({ length: 7 }, (_, i) => json(`r${i}.json`, [spec(`t${i}`)], `2026-11-0${i + 1}T10:00:00.000Z`));
  await open('#/data', many);
  const table = await screen.findByRole('table', { name: 'Runs' });
  expect(within(table).getAllByRole('row')).toHaveLength(1 + 5);
  const more = screen.getByRole('button', { name: 'Show all 7 runs' });
  expect(more).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(more);
  expect(within(table).getAllByRole('row')).toHaveLength(1 + 7);
  expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull();
});

it('downloads the not-imported list as CSV and as JSON, listing every not-imported result', async () => {
  await open('#/data');
  const region = await screen.findByRole('region', { name: /^Notices/ });
  await userEvent.click(within(region).getByRole('button', { name: /Download not-imported list: CSV/ }));
  await userEvent.click(within(region).getByRole('button', { name: /Download not-imported list: JSON/ }));
  expect(downloads).toEqual(['not-imported.csv', 'not-imported.json']);
  const csv = await text(blobs[0]!);
  const BOM = String.fromCharCode(0xfeff);
  expect(BOM + csv).toBe(notImportedCsv(useStore.getState().dataset.imports)); // reading text drops the BOM
  const bytes = await new Promise<Uint8Array>((res) => {
    const r = new FileReader();
    r.onload = () => res(new Uint8Array(r.result as ArrayBuffer));
    r.readAsArrayBuffer(blobs[0]!);
  });
  expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // the file starts with a UTF-8 byte-order mark
  expect(csv.split('\r\n')).toHaveLength(3); // header + the two not-imported notices
  expect(blobs[0]!.type).toContain('text/csv');
  const rows = JSON.parse(await text(blobs[1]!)) as { file: string }[];
  expect(rows.map((r) => r.file)).toEqual(['no-status.json', 'no-name.json']);
});

it('Clear all data: the dialog names the scope and starts on Keep my data; Keep changes nothing', async () => {
  await open('#/data');
  await userEvent.click(await screen.findByRole('button', { name: 'Clear all data' }));
  const dialog = await screen.findByRole('dialog', { name: 'Clear all data?' });
  expect(dialog).toHaveTextContent("This deletes 4 files, 3 runs and all results from this browser. You can't undo this.");
  expect(within(dialog).getByRole('button', { name: 'Keep my data' })).toHaveFocus();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Keep my data' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect((await loadDataset()).imports).toHaveLength(4);
  expect(window.location.hash).toBe('#/data');
});

it('confirming removes everything from IndexedDB and the choices, goes to Start and shows the toast', async () => {
  setPref('columns', ['rank', 'test', 'status']);
  setPref('theme', 'light');
  setPref('density', 'compact');
  setPref('shortcuts', false);
  await open('#/data');
  await userEvent.click(await screen.findByRole('button', { name: 'Clear all data' }));
  await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Clear all data' }));
  await screen.findByRole('heading', { level: 1, name: 'Find your flaky tests' });
  expect(window.location.hash).toBe('#/');
  expect(await loadDataset()).toEqual(emptyDataset());
  expect(useStore.getState().mode).toBe('empty');
  expect(await screen.findByText('All local data cleared')).toBeInTheDocument();
  const kept = (k: string) => window.localStorage.getItem(`flakelens.${k}`);
  expect([kept('columns')]).toEqual([null]);
  expect([kept('theme'), kept('density'), kept('shortcuts')]).toEqual(['"light"', '"compact"', 'false']);
});

it('in sample mode the button reads "Exit sample" and never touches storage', async () => {
  await withData([lab('run-00.json')]);
  window.location.hash = '#/tests';
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: 'Tests ranked by fix priority' });
  await act(() => useStore.getState().startSample());
  act(() => {
    window.location.hash = '#/data';
  });
  await screen.findByRole('heading', { level: 1, name: 'Loaded data' });
  expect(screen.queryByRole('button', { name: 'Clear all data' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Exit sample' }));
  await waitFor(() => expect(useStore.getState().mode).toBe('user'));
  expect((await loadDataset()).imports).toHaveLength(1);
  expect(window.location.hash).toBe('#/tests');
});

it('an empty filter says so and offers Show all tests (Flaky gets the good-news line)', async () => {
  await open('#/tests?status=flaky', [json('a.json', [spec('login works')]), json('b.json', [spec('login works')], '2026-11-02T10:00:00.000Z')]);
  expect(await screen.findByRole('heading', { name: 'No Flaky tests in these 2 runs' })).toBeInTheDocument();
  expect(screen.getByText('More runs make this more certain.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Show all tests' }));
  await waitFor(() => expect(window.location.hash).toBe('#/tests'));
  expect(screen.queryByRole('heading', { name: /No Flaky tests/ })).toBeNull();
});

it('a search with no match suggests a close word and can be cleared', async () => {
  await open('#/tests?q=logn', [json('a.json', [spec('login works')]), json('b.json', [spec('login works')], '2026-11-02T10:00:00.000Z')]);
  expect(await screen.findByRole('heading', { name: 'No test matches "logn"' })).toBeInTheDocument();
  expect(screen.getByText('Search covers test names and file names.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Search for "login" instead' }));
  await waitFor(() => expect(window.location.hash).toBe('#/tests?q=login'));
  expect(screen.queryByRole('heading', { name: /No test matches/ })).toBeNull();

  act(() => {
    window.location.hash = '#/tests?q=zzzz';
  });
  await userEvent.click(await screen.findByRole('button', { name: 'Clear search' }));
  await waitFor(() => expect(window.location.hash).toBe('#/tests'));
});

it('storage off: the app still works for the session and warns that data will not be kept', async () => {
  vi.spyOn(Dexie.prototype, 'open').mockRejectedValue(new Error('blocked'));
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: 'Find your flaky tests' });
  expect(screen.queryByText(/won't keep your data/)).toBeNull(); // nothing loaded yet
  await act(() => useStore.getState().importFiles([lab('run-00.json')]));
  expect(await screen.findByText("This browser won't keep your data after you close the tab. Results are still shown for now.")).toBeInTheDocument();
  expect(useStore.getState()).toMatchObject({ mode: 'user', storage: 'off' });
  await waitFor(() => expect(window.location.hash).toBe('#/tests'));
  expect(screen.getByRole('heading', { level: 1, name: 'Tests ranked by fix priority' })).toBeInTheDocument();
});

it('storage failure: a calm message with Reload, and Start still shows (never a blank page)', async () => {
  flags.failLoad = true;
  const reloadPage = vi.spyOn(reload, 'now').mockImplementation(() => {});
  render(<App />);
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent("Your saved data couldn't be read. Reload to try again.");
  expect(screen.getByRole('heading', { level: 1, name: 'Find your flaky tests' })).toBeInTheDocument();
  await userEvent.click(within(alert).getByRole('button', { name: 'Reload page' }));
  expect(reloadPage).toHaveBeenCalledTimes(1);
});

it('the shortcuts sheet opens from "?" and the header button, lists the keys and closes with Esc back to the opener', async () => {
  await open('#/tests');
  await screen.findByRole('heading', { level: 1, name: 'Tests ranked by fix priority' });
  await userEvent.keyboard('?');
  const sheet = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
  expect(within(sheet).getByRole('checkbox', { name: 'Single-key shortcuts' })).toBeChecked();
  expect(sheet).not.toHaveTextContent('They never fire while you type'); // the behaviour stays, the line goes
  expect(within(sheet).getByText('j / k')).toHaveProperty('tagName', 'KBD');
  for (const line of ['Next / previous test', 'Open details', 'Close details', 'Search', 'This sheet']) expect(sheet).toHaveTextContent(line);
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

  const help = screen.getByRole('button', { name: 'Keyboard shortcuts and help' });
  await userEvent.click(help);
  await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(help).toHaveFocus());
});

it('the shortcuts switch is saved, takes effect at once and turns single-key shortcuts off', async () => {
  await open('#/tests');
  const search = await screen.findByRole('searchbox');
  await userEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts and help' }));
  const sheet = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
  await userEvent.click(within(sheet).getByRole('checkbox', { name: 'Single-key shortcuts' }));
  expect(window.localStorage.getItem('flakelens.shortcuts')).toBe('false');
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  (document.activeElement as HTMLElement | null)?.blur();
  await userEvent.keyboard('/');
  expect(search).not.toHaveFocus();
  await userEvent.keyboard('?');
  expect(screen.queryByRole('dialog')).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts and help' })); // the button still opens it
  const again = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
  expect(within(again).getByRole('checkbox', { name: 'Single-key shortcuts' })).not.toBeChecked();
  await userEvent.click(within(again).getByRole('checkbox', { name: 'Single-key shortcuts' }));
  expect(window.localStorage.getItem('flakelens.shortcuts')).toBe('true');
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  (document.activeElement as HTMLElement | null)?.blur();
  await userEvent.keyboard('/');
  expect(search).toHaveFocus();
});

it('single-key shortcuts are ignored while a dialog is open ("?" does not stack the sheet on the clear dialog)', async () => {
  await open('#/data');
  await userEvent.click(await screen.findByRole('button', { name: 'Clear all data' }));
  await screen.findByRole('dialog', { name: 'Clear all data?' });
  (document.activeElement as HTMLElement | null)?.blur();
  await userEvent.keyboard('?');
  expect(screen.queryByRole('dialog', { name: 'Keyboard shortcuts' })).toBeNull();
  expect(screen.getByRole('dialog', { name: 'Clear all data?' })).toBeInTheDocument();
});

it('Tests has a "Skip to results" control first in the tab order that moves focus to the table', async () => {
  await open('#/tests');
  await screen.findByRole('heading', { level: 1, name: 'Tests ranked by fix priority' });
  (document.activeElement as HTMLElement | null)?.blur();
  await userEvent.tab();
  const skip = screen.getByRole('button', { name: 'Skip to results' });
  expect(skip).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(document.getElementById('results')).toHaveFocus();
});

it('no skip control on Start or Loaded data', async () => {
  await open('#/data');
  await screen.findByRole('heading', { level: 1, name: 'Loaded data' });
  expect(screen.queryByRole('button', { name: 'Skip to results' })).toBeNull();
});

const corruptRows = async (n: number) => {
  const d = new Dexie('flakelens');
  await d.open();
  await d.table('imports').bulkAdd(Array.from({ length: n }, (_, i) => ({ importId: `bad${i}`, seq: i, result: 'nope' })));
  d.close();
};

it('skipped stored rows: a warning with the count on Start, and Clear all data is the way out', async () => {
  await useStore.getState().restore(); // creates the database
  await corruptRows(2);
  render(<App />);
  expect(await screen.findByText("2 saved imports couldn't be read and were skipped. Clear all data to remove them.")).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1, name: 'Find your flaky tests' })).toBeInTheDocument();
});

it('one skipped stored row is said in the singular', async () => {
  await useStore.getState().restore();
  await corruptRows(1);
  render(<App />);
  expect(await screen.findByText("1 saved import couldn't be read and was skipped. Clear all data to remove it.")).toBeInTheDocument();
});

it('the amber dot on the header\'s Loaded data link follows the last import: a warning shows it, "no commit info" alone does not', async () => {
  await open('#/tests', [lab('run-00.json')]); // no commit label: an info notice only
  const link = await screen.findByRole('link', { name: 'Loaded data' });
  expect(link.querySelector('[data-attention]')).toBeNull();
  cleanup();
  await useStore.getState().clearAll();
  useStore.setState(initial, true);
  await open('#/tests', [pw('partial-no-status.json')]); // results left out: a warning
  const warned = await screen.findByRole('link', { name: 'Loaded data' });
  expect(warned.querySelector('[data-attention]')).not.toBeNull();
});

it('Loaded data footer: "Remove data" and one sentence, with Clear all data', async () => {
  await open('#/data');
  expect(await screen.findByText('To remove a file, clear all data.')).toBeInTheDocument();
  expect(screen.getByText('Remove data')).toBeInTheDocument();
  expect(screen.queryByText(/comes in a later version/)).toBeNull();
});

it('files dropped on Loaded data show the result banner there and keep the page (no jump to Tests)', async () => {
  await open('#/data', [lab('run-00.json')]);
  await screen.findByRole('heading', { level: 1, name: 'Loaded data' });
  const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
  await userEvent.upload(input, [lab('run-01.json')]);
  expect(await screen.findByRole('status', { name: 'Import result' })).toHaveTextContent('Added 1 run.');
  expect(window.location.hash).toBe('#/data');
  expect(screen.getByRole('heading', { level: 1, name: 'Loaded data' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Files · 2' })).toBeInTheDocument();
});
