import 'fake-indexeddb/auto';
import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAll as clearDb } from '../data/db';
import { parseFiles } from '../data/worker';
import { useStore } from '../data/store';
import { App } from '../App';

vi.mock('../data/parser', () => ({
  workerParser: () => ({ parseFiles: async (...a: Parameters<typeof parseFiles>) => parseFiles(...a), terminate: () => {} }),
}));

const initial = useStore.getState();
const okFetch = async (url: string) => new Response(readFileSync(`public/${url}`, 'utf8'));
beforeEach(async () => {
  await clearDb();
  useStore.setState(initial, true);
  window.location.hash = '#/';
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('a failed sample load shows an inline error with Try again instead of an unhandled rejection; Try again loads the sample', async () => {
  const unhandled = vi.fn();
  process.on('unhandledRejection', unhandled);
  let failing = true;
  vi.stubGlobal('fetch', async (url: string) => {
    if (failing) throw new TypeError('Failed to fetch');
    return okFetch(url);
  });
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'Try sample data' }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent("The sample data couldn't be loaded.");
  expect(window.location.hash).toBe('#/'); // still on Start
  expect(useStore.getState().mode).toBe('empty');

  failing = false;
  await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(window.location.hash).toBe('#/tests'));
  expect(screen.queryByRole('alert')).toBeNull();
  await new Promise((r) => setTimeout(r, 20));
  process.off('unhandledRejection', unhandled);
  expect(unhandled).not.toHaveBeenCalled();
});

it('a bad manifest or a missing sample file is the same inline error', async () => {
  vi.stubGlobal('fetch', async (url: string) => (url.endsWith('manifest.json') ? new Response('not json') : new Response('', { status: 404 })));
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'Try sample data' }));
  expect(await screen.findByRole('alert')).toHaveTextContent("The sample data couldn't be loaded.");
});

it('Try sample data is a plain centered link under the drop box, and Browse files is the only button in it (DEV-48)', async () => {
  vi.stubGlobal('fetch', okFetch);
  render(<App />);
  const zone = await screen.findByRole('region', { name: 'Import reports' });
  const sample = screen.getByRole('button', { name: 'Try sample data' }); // a <button> that looks like a link: it loads the sample, then navigates
  expect(zone.contains(sample)).toBe(false);
  expect(zone.compareDocumentPosition(sample) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // after the box
  expect(within(zone).getAllByRole('button').map((b) => b.textContent)).toEqual(['Browse files']);
  expect(sample.className).toMatch(/text-sm/); // 14px
  expect(sample.className).toMatch(/text-link/);
  expect(sample.className).toMatch(/underline/);
  expect(sample.className).toMatch(/underline-offset-2/);
  expect(sample.className).toMatch(/min-h-6/); // a tap target of at least 24px
  expect(sample.className).not.toMatch(/(border|bg-secondary)/); // not a button look
  expect(sample.parentElement!.className).toMatch(/justify-center/);
});

it('the sample link is reached with Tab after Browse files, and Enter opens the sample', async () => {
  vi.stubGlobal('fetch', okFetch);
  render(<App />);
  const sample = await screen.findByRole('button', { name: 'Try sample data' });
  const browse = screen.getByRole('button', { name: 'Browse files' });
  browse.focus();
  await userEvent.tab();
  expect(sample).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(window.location.hash).toBe('#/tests'));
  expect(useStore.getState().mode).toBe('sample');
});
