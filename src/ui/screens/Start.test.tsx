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
