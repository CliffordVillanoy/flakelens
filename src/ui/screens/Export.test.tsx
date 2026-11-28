import { it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildDataset } from '@/engine/score/testkit';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import type { Dataset } from '@/engine/types';
import { useStore } from '../data/store';
import { useExportScope } from '../lib/exportScope';
import { Toasts } from '../components/Toasts';
import { Tests } from './Tests';

const files: { name: string; mime: string; body: string }[] = [];
vi.mock('../lib/download', () => ({ downloadFile: (name: string, mime: string, body: string) => files.push({ name, mime, body }) }));

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
// four Flaky tests and one Failing
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
  files.length = 0;
  window.location.hash = '#/tests';
  useExportScope.setState({ scope: 'view' });
  load(fixture());
});

const open = async (hash = '#/tests') => {
  window.location.hash = hash;
  render(
    <>
      <Tests />
      <Toasts />
    </>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Export' }));
  return screen.getByRole('menu', { name: 'Export' });
};
const csvRows = (body: string) => body.slice(1).split('\r\n').slice(1);

it('the menu opens with the scope choice, then Copy top Flaky tests, Download CSV, Download JSON, Open report, and no hint lines', async () => {
  const menu = await open();
  const group = within(menu).getByRole('group', { name: 'What to export' });
  const scopes = within(group).getAllByRole('menuitemradio');
  expect(scopes.map((s) => s.textContent)).toEqual(['Current view (5 tests)', 'All tests (5)']);
  expect(scopes[0]).toHaveAttribute('aria-checked', 'true');
  expect(scopes[1]).toHaveAttribute('aria-checked', 'false');
  expect(within(menu).getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Copy top Flaky tests', 'Download CSV', 'Download JSON', 'Open report']);
  // explanations are tooltips, not text on the menu
  expect(menu).not.toHaveTextContent(/spreadsheet|for scripts|Markdown list|Ignores the tab|Coming in v1/);
  expect(within(menu).getByRole('menuitem', { name: 'Download CSV' })).toHaveAttribute('title', 'One row per test, opens in a spreadsheet');
});

it('Download CSV writes flakelens-tests.csv with one row per test, and the toast names the file and the count', async () => {
  const menu = await open();
  await userEvent.click(within(menu).getByRole('menuitem', { name: 'Download CSV' }));
  expect(files).toHaveLength(1);
  expect(files[0]!.name).toBe('flakelens-tests.csv');
  expect(files[0]!.mime).toMatch(/^text\/csv/);
  expect(csvRows(files[0]!.body)).toHaveLength(5);
  expect(await screen.findByText('Downloaded flakelens-tests.csv. 5 tests.')).toBeInTheDocument();
  expect(screen.queryByRole('menu')).toBeNull();
});

it('Download JSON writes flakelens-tests.json with the scope', async () => {
  const menu = await open();
  await userEvent.click(within(menu).getByRole('menuitem', { name: 'Download JSON' }));
  expect(files[0]!.name).toBe('flakelens-tests.json');
  const data = JSON.parse(files[0]!.body);
  expect(data).toMatchObject({ app: 'FlakeLens', scope: 'view' });
  expect(data.tests).toHaveLength(5);
  expect(await screen.findByText('Downloaded flakelens-tests.json. 5 tests.')).toBeInTheDocument();
});

it('Current view follows the tab and the search; All tests ignores both; the choice is remembered', async () => {
  const menu = await open('#/tests?status=flaky&q=a');
  const scopes = within(menu).getAllByRole('menuitemradio');
  expect(scopes.map((s) => s.textContent)).toEqual(['Current view (4 tests)', 'All tests (5)']); // alpha, beta, gamma, delta
  expect(scopes[0]).toHaveAttribute('title', 'Flaky tab, search "a"');
  expect(scopes[1]).toHaveAttribute('title', 'Ignores the tab and the search');
  await userEvent.click(within(menu).getByRole('menuitem', { name: 'Download CSV' }));
  expect(csvRows(files[0]!.body)).toHaveLength(4);

  await userEvent.click(screen.getByRole('button', { name: 'Export' }));
  await userEvent.click(screen.getByRole('menuitemradio', { name: 'All tests (5)' }));
  expect(screen.getByRole('menu')).toBeInTheDocument(); // choosing a scope keeps the menu open
  expect(screen.getByRole('menuitemradio', { name: 'All tests (5)' })).toHaveAttribute('aria-checked', 'true');
  await userEvent.click(screen.getByRole('menuitem', { name: 'Download CSV' }));
  expect(csvRows(files[1]!.body)).toHaveLength(5);
  expect(JSON.parse((await (async () => { await userEvent.click(screen.getByRole('button', { name: 'Export' })); await userEvent.click(screen.getByRole('menuitem', { name: 'Download JSON' })); return files[2]!; })()).body).scope).toBe('all');
  expect(useExportScope.getState().scope).toBe('all'); // remembered while on the page
});

it('Copy top Flaky tests follows the scope', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const menu = await open('#/tests?q=gamma');
  await userEvent.click(within(menu).getByRole('menuitem', { name: 'Copy top Flaky tests' }));
  expect(writeText.mock.calls[0]![0]).toMatch(/^1\. gamma/);
  expect((writeText.mock.calls[0]![0] as string).split('\n')).toHaveLength(1);
});

it('Open report goes to #/report with the scope and the filters', async () => {
  const menu = await open('#/tests?status=flaky&q=a');
  await userEvent.click(within(menu).getByRole('menuitem', { name: 'Open report' }));
  await waitFor(() => expect(window.location.hash).toBe('#/report?scope=view&status=flaky&q=a'));
});

it('with zero tests in the view the file actions are off, the reason is written beside them, and "Export all tests" fixes it', async () => {
  const menu = await open('#/tests?q=zzzz');
  expect(within(menu).getByRole('menuitemradio', { name: 'Current view (0 tests)' })).toBeInTheDocument();
  for (const name of ['Download CSV', 'Download JSON', 'Open report']) expect(within(menu).getByRole('menuitem', { name })).toHaveAttribute('aria-disabled', 'true');
  expect(within(menu).getByText('Nothing to export in this view')).toBeInTheDocument();
  expect(within(menu).getByText('No tests match the search "zzzz". Choose All tests, or clear the search.')).toBeInTheDocument();
  await userEvent.click(within(menu).getByRole('menuitem', { name: 'Download CSV' }));
  expect(files).toHaveLength(0);
  await userEvent.click(within(menu).getByRole('menuitem', { name: 'Export all tests' }));
  expect(screen.getByRole('menuitemradio', { name: 'All tests (5)' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('menuitem', { name: 'Download CSV' })).not.toHaveAttribute('aria-disabled', 'true');
  expect(screen.queryByText('Nothing to export in this view')).toBeNull();
});

it('sample data says so inside the files: a "data" column in the CSV, sample: true in the JSON', async () => {
  load(fixture(), 'sample');
  const menu = await open();
  await userEvent.click(within(menu).getByRole('menuitem', { name: 'Download CSV' }));
  expect(files[0]!.body.slice(1).split('\r\n')[0]!.endsWith(',data')).toBe(true);
  await userEvent.click(screen.getByRole('button', { name: 'Export' }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Download JSON' }));
  expect(JSON.parse(files[1]!.body).sample).toBe(true);
});

it('arrows move through the scope choices and the actions in order, Escape closes and returns focus', async () => {
  const menu = await open();
  const all = [...menu.querySelectorAll<HTMLElement>('[role^=menuitem]')];
  expect(all).toHaveLength(6);
  expect(all[0]).toHaveFocus();
  await userEvent.keyboard('{ArrowDown}{ArrowDown}');
  expect(all[2]).toHaveFocus();
  await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
  expect(all[5]).toHaveFocus(); // wraps round
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('menu')).toBeNull();
  expect(screen.getByRole('button', { name: 'Export' })).toHaveFocus();
});

it('every status tab works with the menu, including the ones with no tests (the tooltip names the tab)', async () => {
  for (const [status, name] of [['insufficient', 'Not enough data'], ['stable', 'Stable'], ['unproven', 'Unproven'], ['failing', 'Failing']] as const) {
    const { unmount } = render(<Tests />);
    window.location.hash = `#/tests?status=${status}`;
    await userEvent.click(await screen.findByRole('button', { name: 'Export' }));
    const view = within(screen.getByRole('menu')).getAllByRole('menuitemradio')[0]!;
    expect(view).toHaveAttribute('title', `${name} tab`);
    unmount();
  }
});
