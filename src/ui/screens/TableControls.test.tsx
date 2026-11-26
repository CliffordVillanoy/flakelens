import { it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildDataset } from '@/engine/score/testkit';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import type { Dataset } from '@/engine/types';
import { useStore } from '../data/store';
import { Toasts } from '../components/Toasts';
import { Tests } from './Tests';

const PROPS = { clientHeight: 800, clientWidth: 1200, offsetHeight: 56, offsetWidth: 1200 } as const;
const real = Object.fromEntries(Object.keys(PROPS).map((k) => [k, Object.getOwnPropertyDescriptor(HTMLElement.prototype, k)]));
beforeAll(() => {
  for (const [k, v] of Object.entries(PROPS)) Object.defineProperty(HTMLElement.prototype, k, { configurable: true, get: () => v });
});
afterAll(() => {
  for (const [k, d] of Object.entries(real)) if (d) Object.defineProperty(HTMLElement.prototype, k, d);
});

const initial = useStore.getState();
const load = (ds: Dataset, mode: 'user' | 'sample' = 'user') =>
  useStore.setState({ ...initial, mode, dataset: ds, ranked: rankTests(scoreTests(ds), ds.tests) }, true);
// four Flaky tests with different wasted time, plus a failing one
const fixture = () =>
  buildDataset(
    [
      { commit: 'a', tests: { beta: ['fail', 'pass'], alpha: ['fail', 'pass'], gamma: ['fail', 'fail', 'fail', 'pass'], delta: ['fail', 'pass'], broken: ['fail'] } },
      { commit: 'b', tests: { beta: ['fail', 'pass'], alpha: ['pass'], gamma: ['pass'], delta: ['pass'], broken: ['fail'] } },
      { commit: 'c', tests: { beta: ['pass'], alpha: ['pass'], gamma: ['pass'], delta: ['pass'], broken: ['fail'] } },
    ],
    60_000,
  );

beforeEach(() => {
  window.location.hash = '#/tests';
  load(fixture());
});

const names = () => screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('#/tests/') && !a.textContent?.startsWith('see evidence')).map((a) => a.textContent);

it('filter chips: removing one updates the table and the URL; Clear filters resets both', async () => {
  window.location.hash = '#/tests?status=flaky&q=e';
  render(<Tests />);
  const chips = screen.getByRole('group', { name: 'Active filters' });
  expect(within(chips).getByText('Status: Flaky')).toBeInTheDocument();
  expect(within(chips).getByText('Search: "e"')).toBeInTheDocument();
  expect(names()).not.toContain('broken');
  await userEvent.click(within(chips).getByRole('button', { name: 'Remove filter Status: Flaky' }));
  await waitFor(() => expect(window.location.hash).toBe('#/tests?q=e'));
  expect(names()).toContain('broken');
  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  await waitFor(() => expect(window.location.hash).toBe('#/tests'));
  expect(screen.queryByRole('group', { name: 'Active filters' })).toBeNull();
  expect(screen.getByRole('searchbox')).toHaveValue('');
});

it('columns: Test and Status are locked, choices survive a remount, Reset to default restores', async () => {
  const { unmount } = render(<Tests />);
  await userEvent.click(screen.getByRole('button', { name: 'Columns' }));
  const picker = screen.getByRole('dialog', { name: 'Choose columns' });
  expect(within(picker).getByRole('checkbox', { name: /Test/ })).toBeDisabled();
  expect(within(picker).getByRole('checkbox', { name: /Status/ })).toBeDisabled();
  await userEvent.click(within(picker).getByRole('checkbox', { name: 'Flakiness score' }));
  await userEvent.click(within(picker).getByRole('checkbox', { name: 'Evidence' }));
  expect(screen.getByRole('columnheader', { name: 'Flakiness score' })).toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: 'Evidence' })).toBeNull();
  unmount();
  render(<Tests />);
  expect(screen.getByRole('columnheader', { name: 'Flakiness score' })).toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: 'Evidence' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Columns' }));
  await userEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
  expect(screen.queryByRole('columnheader', { name: 'Flakiness score' })).toBeNull();
  expect(screen.getByRole('columnheader', { name: 'Evidence' })).toBeInTheDocument();
});

it('density: Comfortable by default, Compact is saved and survives a remount', async () => {
  const { unmount } = render(<Tests />);
  const group = screen.getByRole('group', { name: 'Row density' });
  expect(within(group).getByRole('button', { name: 'Comfortable' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(within(group).getByRole('button', { name: 'Compact' }));
  expect(screen.getByRole('table')).toHaveAttribute('data-density', 'compact');
  unmount();
  render(<Tests />);
  expect(screen.getByRole('table')).toHaveAttribute('data-density', 'compact');
  expect(within(screen.getByRole('group', { name: 'Row density' })).getByRole('button', { name: 'Compact' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

it('export: copies the Markdown list and shows the toast; CSV and JSON cannot be activated', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  render(
    <>
      <Tests />
      <Toasts />
    </>,
  );
  const button = screen.getByRole('button', { name: 'Export' });
  expect(button).toHaveAttribute('aria-haspopup', 'menu');
  await userEvent.click(button);
  const menu = screen.getByRole('menu', { name: 'Export' });
  const csv = within(menu).getByRole('menuitem', { name: /Download CSV/ });
  const json = within(menu).getByRole('menuitem', { name: /Download JSON/ });
  expect(csv).toHaveAttribute('aria-disabled', 'true');
  expect(csv).toHaveTextContent('Coming in v1');
  await userEvent.click(csv);
  json.focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.keyboard(' ');
  expect(writeText).not.toHaveBeenCalled();
  expect(screen.getByRole('menu')).toBeInTheDocument(); // disabled items do nothing, not even close the menu
  await userEvent.click(within(menu).getByRole('menuitem', { name: /Copy top Flaky tests/ }));
  expect(writeText).toHaveBeenCalledTimes(1);
  expect(writeText.mock.calls[0]![0]).toMatch(/^1\. /);
  expect(await screen.findByText('Summary copied')).toBeInTheDocument();
  expect(screen.queryByRole('menu')).toBeNull();
});

it('export menu: arrows move, Escape closes and returns focus to the button', async () => {
  render(<Tests />);
  const button = screen.getByRole('button', { name: 'Export' });
  await userEvent.click(button);
  const items = within(screen.getByRole('menu')).getAllByRole('menuitem');
  expect(items[0]).toHaveFocus();
  await userEvent.keyboard('{ArrowDown}');
  expect(items[1]).toHaveFocus();
  await userEvent.keyboard('{ArrowUp}{ArrowUp}');
  expect(items[2]).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('menu')).toBeNull();
  expect(button).toHaveFocus();
});

it('sortable headers: Test and Wasted time re-sort inside groups, with aria-sort; group order never changes', async () => {
  render(<Tests />);
  const flakyNames = () => names().filter((n) => n !== 'broken');
  const rankOrder = flakyNames();
  const testHeader = screen.getByRole('columnheader', { name: /Test/ });
  const wastedHeader = screen.getByRole('columnheader', { name: /Wasted time/ });
  expect(testHeader).toHaveAttribute('aria-sort', 'none');
  await userEvent.click(within(testHeader).getByRole('button'));
  expect(testHeader).toHaveAttribute('aria-sort', 'ascending');
  expect(flakyNames()).toEqual(['alpha', 'beta', 'delta', 'gamma']);
  expect(names().at(-1)).toBe('broken'); // Failing group stays after Flaky
  within(testHeader).getByRole('button').focus();
  await userEvent.keyboard('{Enter}');
  expect(testHeader).toHaveAttribute('aria-sort', 'descending');
  expect(flakyNames()).toEqual(['gamma', 'delta', 'beta', 'alpha']);
  await userEvent.click(within(wastedHeader).getByRole('button'));
  expect(wastedHeader).toHaveAttribute('aria-sort', 'descending');
  expect(testHeader).toHaveAttribute('aria-sort', 'none');
  expect(screen.getByText(/sorted by wasted time$/)).toBeInTheDocument();
  await userEvent.click(within(wastedHeader).getByRole('button'));
  expect(wastedHeader).toHaveAttribute('aria-sort', 'ascending');
  await userEvent.click(within(wastedHeader).getByRole('button'));
  expect(wastedHeader).toHaveAttribute('aria-sort', 'none'); // third press returns to the default rank order
  expect(flakyNames()).toEqual(rankOrder);
});

it('first run: the top 3 Flaky rows get a "see evidence" link to their panel', () => {
  render(<Tests />);
  const why = screen.getAllByRole('link', { name: /^see evidence/ });
  expect(why).toHaveLength(3);
  const first = screen.getAllByRole('row').find((r) => r.textContent?.includes('see evidence'))!;
  const id = first.querySelector('a')!.getAttribute('href');
  expect(why[0]).toHaveAttribute('href', id);
});

it('the Export tip can be dismissed and stays dismissed', async () => {
  const { unmount } = render(<Tests />);
  const tip = screen.getByRole('note');
  expect(tip).toHaveTextContent(/Export/);
  await userEvent.click(within(tip).getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByRole('note')).toBeNull();
  unmount();
  render(<Tests />);
  expect(screen.queryByRole('note')).toBeNull();
});

it('sample banner: one sentence and Exit sample; the not-imported link lives in the health box', () => {
  load(fixture(), 'sample');
  render(<Tests />);
  expect(screen.queryByRole('link', { name: 'see why' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Exit sample' })).toBeInTheDocument();
});
