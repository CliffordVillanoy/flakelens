import 'fake-indexeddb/auto';
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from '../data/store';
import { reload } from '../lib/reload';
import { StorageBanner } from './StorageBanner';

const initial = useStore.getState();
beforeEach(() => {
  useStore.setState(initial, true);
  window.location.hash = '#/';
});
const own = { mode: 'user' as const };

it('only one banner at a time: failed first, then skipped, then off', () => {
  useStore.setState({ ...own, storage: 'failed', skippedRows: 2 });
  const { rerender } = render(<StorageBanner />);
  expect(screen.getAllByText(/./, { selector: 'p' })).toHaveLength(1);
  expect(screen.getByText(/Your saved data couldn't be read/)).toBeInTheDocument();

  useStore.setState({ storage: 'ok', skippedRows: 2 });
  rerender(<StorageBanner />);
  expect(screen.getAllByText(/./, { selector: 'p' })).toHaveLength(1);
  expect(screen.getByText(/2 saved imports couldn't be read/)).toBeInTheDocument();

  useStore.setState({ storage: 'off', skippedRows: 0 });
  rerender(<StorageBanner />);
  expect(screen.getAllByText(/./, { selector: 'p' })).toHaveLength(1);
  expect(screen.getByText("This browser won't keep your data after you close the tab. Results are still shown for now.")).toBeInTheDocument();
});

it('an error banner is a role alert with Reload page and no Dismiss', async () => {
  const reloadPage = vi.spyOn(reload, 'now').mockImplementation(() => {});
  useStore.setState({ ...own, storage: 'failed' });
  render(<StorageBanner />);
  const alert = screen.getByRole('alert');
  expect(within(alert).queryByRole('button', { name: 'Dismiss' })).toBeNull();
  await userEvent.click(within(alert).getByRole('button', { name: 'Reload page' }));
  expect(reloadPage).toHaveBeenCalledTimes(1);
});

it('a warning banner has Dismiss; once dismissed it stays dismissed until the next page load', async () => {
  useStore.setState({ ...own, storage: 'off' });
  const { rerender } = render(<StorageBanner />);
  expect(screen.getByRole('status')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByText(/won't keep your data/)).toBeNull();
  rerender(<StorageBanner />);
  useStore.setState({ storage: 'off', mode: 'user' }); // the same state again does not bring it back
  expect(screen.queryByText(/won't keep your data/)).toBeNull();
});

it('the skipped banner offers Clear all data, which opens the usual confirmation and then clears', async () => {
  useStore.setState({ ...own, storage: 'ok', skippedRows: 1 });
  render(<StorageBanner />);
  await userEvent.click(screen.getByRole('button', { name: 'Clear all data' }));
  const dialog = await screen.findByRole('dialog', { name: 'Clear all data?' });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Clear all data' }));
  await waitFor(() => expect(useStore.getState().skippedRows).toBe(0));
  expect(screen.queryByText(/couldn't be read/)).toBeNull();
});

it('the banner sits in the page flow at the content width', () => {
  useStore.setState({ ...own, storage: 'off' });
  render(<StorageBanner />);
  const banner = screen.getByRole('status');
  expect(banner).toHaveClass('max-w-[1232px]');
  expect(banner.className).not.toMatch(/\b(fixed|absolute)\b/);
});
