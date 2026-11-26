import 'fake-indexeddb/auto';
import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAll as clearDb, loadDataset } from '../data/db';
import { parseFiles } from '../data/worker';
import { useStore } from '../data/store';
import { App } from '../App';

vi.mock('../data/parser', () => ({
  workerParser: () => ({ parseFiles: async (...a: Parameters<typeof parseFiles>) => parseFiles(...a), terminate: () => {} }),
}));

const lab = (f: string, name = f) => new File([readFileSync(`fixtures/lab/${f}`, 'utf8')], name);
const initial = useStore.getState();
const open = async (fs: File[], label?: Record<string, string>) => {
  await useStore.getState().restore();
  await useStore.getState().importFiles(fs);
  for (const [name, text] of Object.entries(label ?? {})) {
    await useStore.getState().setCommitLabel(useStore.getState().dataset.imports.find((i) => i.fileName === name)!.importId, text);
  }
  window.location.hash = '#/data';
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: 'Loaded data' });
};
const row = (name: string) => screen.getAllByText(name).map((e) => e.closest('li')).find(Boolean)!;
const ids = () => useStore.getState().dataset.imports.map((i) => i.fileName);

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

it('each file row has a Remove button; the old "clear all data" footer line is gone', async () => {
  await open([lab('run-00.json'), lab('run-01.json')]);
  expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2);
  expect(screen.queryByText('To remove a file, clear all data.')).toBeNull();
  expect(screen.getByRole('main').querySelector('section:last-of-type')).toHaveTextContent('Clear all data');
});

it('the confirmation names the file, its runs, the tests affected and the label; focus starts on Keep file', async () => {
  await open([lab('run-00.json'), lab('run-01.json')], { 'run-00.json': 'c0' });
  const user = userEvent.setup();
  await user.click(within(row('run-00.json')).getByRole('button', { name: 'Remove' }));
  const dialog = await screen.findByRole('dialog', { name: 'Remove run-00.json?' });
  expect(within(dialog).getByText('1 run and its attempts')).toBeInTheDocument();
  expect(within(dialog).getByText(/tests? changes? status or evidence/)).toBeInTheDocument();
  expect(within(dialog).getByText('the commit label "c0"')).toBeInTheDocument();
  expect(within(dialog).getByText(/Rankings are recalculated/)).toBeInTheDocument();
  expect(within(dialog).queryByText(/undo/i)).toBeNull(); // rule 8: the toast says it
  expect(within(dialog).getByRole('button', { name: 'Keep file' })).toHaveFocus();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(ids()).toEqual(['run-00.json', 'run-01.json']); // Esc keeps the file
});

it('Remove file deletes it, shows the undo toast, and Undo restores the file with its label', async () => {
  await open([lab('run-00.json'), lab('run-01.json')], { 'run-00.json': 'c0' });
  const user = userEvent.setup();
  await user.click(within(row('run-00.json')).getByRole('button', { name: 'Remove' }));
  await user.click(await screen.findByRole('button', { name: 'Remove file' }));
  expect(await screen.findByText('run-00.json removed. Rankings updated.')).toBeInTheDocument();
  expect(ids()).toEqual(['run-01.json']);
  expect((await loadDataset()).imports.map((i) => i.fileName)).toEqual(['run-01.json']);
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  expect(await screen.findByText('run-00.json restored. Rankings updated.')).toBeInTheDocument();
  expect(ids()).toEqual(['run-00.json', 'run-01.json']);
  expect(useStore.getState().dataset.imports[0]!.commitLabel).toBe('c0');
  expect((await loadDataset()).imports.map((i) => i.fileName).sort()).toEqual(['run-00.json', 'run-01.json']);
});

it('a file whose runs another file already holds says they stay', async () => {
  await open([lab('run-00.json'), lab('run-01.json'), lab('run-00.json', 'again.json')]);
  const user = userEvent.setup();
  await user.click(within(row('again.json')).getByRole('button', { name: 'Remove' }));
  const dialog = await screen.findByRole('dialog', { name: 'Remove again.json?' });
  expect(dialog).toHaveTextContent('This removes 0 runs. 1 run in this file is also in run-00.json, so it stays.');
});

it('the last file: the sentence says so, and removing it returns to Start with the toast following', async () => {
  await open([lab('run-00.json')]);
  const user = userEvent.setup();
  await user.click(within(row('run-00.json')).getByRole('button', { name: 'Remove' }));
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent('This is your last file. Removing it clears all results and takes you back to the start screen.');
  await user.click(within(dialog).getByRole('button', { name: 'Remove file' }));
  expect(await screen.findByText('run-00.json removed. All results cleared.')).toBeInTheDocument();
  await waitFor(() => expect(window.location.hash).toBe('#/'));
  expect(await screen.findByRole('heading', { level: 1, name: /flaky tests/i })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  await waitFor(() => expect(ids()).toEqual(['run-00.json']));
});

it('sample data has no Remove buttons', async () => {
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: /sample data/i }));
  await screen.findByRole('table');
  window.location.hash = '#/data';
  await screen.findByRole('heading', { level: 1, name: 'Loaded data' });
  expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
});
