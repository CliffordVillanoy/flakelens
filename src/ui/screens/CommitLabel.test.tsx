import 'fake-indexeddb/auto';
import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dexie from 'dexie';
import { clearAll as clearDb, loadDataset } from '../data/db';
import { parseFiles } from '../data/worker';
import { useStore } from '../data/store';
import { App } from '../App';

vi.mock('../data/parser', () => ({
  workerParser: () => ({ parseFiles: async (...a: Parameters<typeof parseFiles>) => parseFiles(...a), terminate: () => {} }),
}));

const json = (name: string, title: string, status = 'passed', startTime = '2026-11-01T10:00:00.000Z') =>
  new File(
    [
      JSON.stringify({
        config: {},
        stats: { startTime },
        suites: [{ title: 'a.spec.ts', file: 'a.spec.ts', specs: [{ title, tests: [{ projectName: 'c', results: [{ status, retry: 0, duration: 5 }] }] }] }],
      }),
    ],
    name,
  );
const initial = useStore.getState();
const open = async (fs: File[], labels?: Record<string, string>) => {
  await useStore.getState().restore();
  await useStore.getState().importFiles(fs, labels);
  window.location.hash = '#/data';
  render(<App />);
  await screen.findByRole('heading', { name: 'Loaded data' });
};
const row = (name: string) => screen.getAllByText(name).map((e) => e.closest('li')).find(Boolean)!;
const field = (name: string) => within(row(name)).getByRole('textbox', { name: 'Commit or label' });

beforeEach(async () => {
  await clearDb();
  useStore.setState(initial, true);
  window.location.hash = '#/';
  vi.stubGlobal('fetch', async (url: string) => new Response(readFileSync(`public/${url}`, 'utf8')));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('every file with runs has a "Commit or label" field with a source tag; no grey helper sentences', async () => {
  await open([json('a.json', 'x'), json('b.json', 'x', 'passed', '2026-11-02T10:00:00.000Z')], { 'b.json': '7c2e01d' });
  expect(screen.getAllByRole('textbox', { name: 'Commit or label' })).toHaveLength(2);
  expect(within(row('a.json')).getByText('No commit info')).toBeInTheDocument();
  expect(within(row('a.json')).getByText('No commit info found. This file counts as its own commit.')).toBeInTheDocument();
  expect(within(row('b.json')).getByText('From the report')).toBeInTheDocument();
  expect(field('b.json')).toHaveAttribute('placeholder', '7c2e01d');
  expect(field('a.json')).toHaveAttribute('placeholder', 'Add a commit or label');
  for (const gone of ['Leave empty to use the commit', 'Enter saves, Esc cancels', 'A label you type replaces it']) {
    expect(screen.queryByText(new RegExp(gone))).toBeNull();
  }
});

it('Save label stores the label, announces it, recomputes the runs and persists', async () => {
  await open([json('a.json', 'x')]);
  const user = userEvent.setup();
  expect(screen.queryByRole('button', { name: 'Save label' })).toBeNull(); // only while editing
  await user.type(field('a.json'), '  c0 ');
  expect(within(row('a.json')).getByText('5 / 100')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save label' }));
  expect(await within(row('a.json')).findByText('Label saved. Rankings updated.')).toBeInTheDocument();
  expect(within(row('a.json')).getByText('Your label')).toBeInTheDocument();
  expect(field('a.json')).toHaveValue('c0');
  expect(useStore.getState().dataset.runs[0]!.commit).toBe('c0');
  expect((await loadDataset()).imports[0]!.commitLabel).toBe('c0');
  expect(screen.queryByRole('button', { name: 'Save label' })).toBeNull();
});

it('Enter saves and Esc cancels', async () => {
  await open([json('a.json', 'x')]);
  const user = userEvent.setup();
  await user.type(field('a.json'), 'abc{Escape}');
  expect(field('a.json')).toHaveValue('');
  expect(useStore.getState().dataset.runs[0]!.commit).toBeNull();
  await user.type(field('a.json'), 'abc{Enter}');
  expect(await within(row('a.json')).findByText('Label saved. Rankings updated.')).toBeInTheDocument();
  expect(useStore.getState().dataset.runs[0]!.commit).toBe('abc');
});

it('typing stops at 100 characters and the limit message shows', async () => {
  await open([json('a.json', 'x')]);
  const user = userEvent.setup();
  await user.click(field('a.json'));
  await user.paste('x'.repeat(130));
  expect(field('a.json')).toHaveValue('x'.repeat(100));
  expect(within(row('a.json')).getByText('100 / 100')).toBeInTheDocument();
  expect(within(row('a.json')).getByText('Labels can be up to 100 characters. Typing stops at the limit.')).toBeInTheDocument();
});

it('Remove label (the x) clears it and announces the removal', async () => {
  await open([json('a.json', 'x')]);
  const user = userEvent.setup();
  await user.type(field('a.json'), 'mine{Enter}');
  await within(row('a.json')).findByText('Label saved. Rankings updated.');
  await user.click(within(row('a.json')).getByRole('button', { name: 'Remove label' }));
  expect(await within(row('a.json')).findByText('Label removed. Rankings updated.')).toBeInTheDocument();
  expect(field('a.json')).toHaveValue('');
  expect(useStore.getState().dataset.imports[0]!.commitLabel).toBeUndefined();
});

it('says when another file uses the same label', async () => {
  await open([json('a.json', 'x'), json('b.json', 'x', 'failed', '2026-11-02T10:00:00.000Z')]);
  const user = userEvent.setup();
  await user.type(field('a.json'), 'c0{Enter}');
  await user.type(field('b.json'), 'c0{Enter}');
  expect(await within(row('a.json')).findByText('Also used by 1 other file.')).toBeInTheDocument();
  expect(within(row('b.json')).getByText('Also used by 1 other file.')).toBeInTheDocument();
});

it('sample data: read-only field with the lock, the tag and the one-line text', async () => {
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: /sample data/i }));
  await screen.findByRole('table');
  window.location.hash = '#/data';
  await screen.findByRole('heading', { name: 'Loaded data' });
  const first = screen.getAllByRole('textbox', { name: 'Commit or label' })[0]!;
  expect(first).toHaveAttribute('readonly');
  const li = first.closest('li')!;
  expect(within(li).getByText('Read-only')).toBeInTheDocument();
  expect(within(li).getByText('Read-only in sample data.')).toBeInTheDocument();
  expect(li.querySelector('svg.lucide-lock')).not.toBeNull();
  expect(within(li).queryByRole('button', { name: 'Save label' })).toBeNull();
});

it('when storage blocks the save, an alert says the label would be lost and Try again saves it', async () => {
  await open([json('a.json', 'x')]);
  const user = userEvent.setup();
  const tx = vi.spyOn(Dexie.prototype, 'transaction').mockRejectedValueOnce(new Error('blocked'));
  await user.type(field('a.json'), 'c0{Enter}');
  const alert = await within(row('a.json')).findByRole('alert');
  expect(alert).toHaveTextContent("Couldn't save the label. Your browser blocked storage, so the label would be lost when you close the tab.");
  expect(useStore.getState().dataset.runs[0]!.commit).toBe('c0'); // kept for the session
  tx.mockRestore();
  await user.click(within(alert).getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(within(row('a.json')).queryByRole('alert')).toBeNull());
  expect((await loadDataset()).imports[0]!.commitLabel).toBe('c0');
});

it('the runs table shows a typed label with the label tag, and a SHA without one', async () => {
  await open([json('a.json', 'x'), json('b.json', 'x', 'passed', '2026-11-02T10:00:00.000Z')], { 'b.json': '7c2e01dabcdef' });
  const user = userEvent.setup();
  await user.type(field('a.json'), 'release-candidate{Enter}');
  await within(row('a.json')).findByText('Label saved. Rankings updated.');
  const table = screen.getByRole('table', { name: 'Runs' });
  const cells = within(table).getAllByRole('row').map((r) => r.textContent);
  expect(cells.some((c) => c?.includes('release-candidate') && c.includes('label'))).toBe(true);
  expect(cells.some((c) => c?.includes('7c2e01d') && !c.includes('7c2e01da'))).toBe(true);
});

it('the no-commit note links to the first file without commit info and moves focus there', async () => {
  await useStore.getState().restore();
  await useStore.getState().importFiles([json('a.json', 'x'), json('b.json', 'y', 'passed', '2026-11-02T10:00:00.000Z')]);
  window.location.hash = '#/tests';
  render(<App />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('link', { name: 'Add a commit label' }));
  await waitFor(() => expect(field('a.json')).toHaveFocus());
});
