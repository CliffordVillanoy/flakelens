import { it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildDataset } from '@/engine/score/testkit';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import type { AttemptStatus, Dataset } from '@/engine/types';
import { useStore } from '../data/store';
import { Tests, HEADER_PX, BAND_PX } from './Tests';

// jsdom has no layout; give the virtual list a viewport (TanStack reads client* for the scroller, offset* for items).
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

// flaky (mixed commit a), failing, stable (x5 runs), not enough data
const fixture = () =>
  buildDataset([
    { commit: 'a', tests: { flaky: ['fail', 'pass'], failing: ['fail'], stable: ['pass'] } },
    { commit: 'b', tests: { flaky: ['pass'], failing: ['fail'], stable: ['pass'] } },
    { commit: 'c', tests: { flaky: ['pass'], failing: ['fail'], stable: ['pass'] } },
    { commit: 'd', tests: { flaky: ['fail'], failing: ['fail'], stable: ['pass'], lonely: ['pass'] } },
  ]);

beforeEach(() => {
  window.location.hash = '#/tests';
  load(fixture());
});

const groupBands = () => screen.getAllByRole('rowheader').map((h) => h.textContent);

it('groups appear Flaky, Unproven, Failing, Stable, Not enough data; Stable and Not enough data start collapsed', async () => {
  render(<Tests />);
  expect(groupBands()).toEqual([
    'Flaky · 1',
    'Failing · 1',
    'Stable · 1',
    'Not enough data · 1',
  ]);
  // The meaning of a group is a tooltip on its name, not a grey line under it (rule 8).
  expect(screen.getByText('Flaky · 1')).toHaveAttribute('title', 'Different results on the same commit');
  expect(screen.getByText('Stable · 1')).toHaveAttribute('title', 'No sign of flakiness');
  expect(screen.getByRole('link', { name: 'flaky' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'stable' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Show 1 Stable tests' }));
  expect(screen.getByRole('link', { name: 'stable' })).toBeInTheDocument();
});

it('rows show the pill word only, the evidence sentence and wasted time; the name links to the test', () => {
  render(<Tests />);
  const row = screen.getByRole('link', { name: 'flaky' }).closest<HTMLElement>('[role=row]')!;
  const pill = within(row).getByText('Flaky', { selector: '[data-pill]' });
  expect(pill.querySelector('svg')).toBeNull();
  expect(row).toHaveTextContent('1 of 4 commits had mixed results');
  expect(within(row).getByRole('link', { name: 'flaky' })).toHaveAttribute('href', '#/tests/flaky');
  const failing = screen.getByRole('link', { name: 'failing' }).closest<HTMLElement>('[role=row]')!;
  expect(failing).toHaveTextContent('Failed 4 of 4 runs');
  expect(failing).toHaveTextContent('—');
});

it('the run strip has one spoken label and the failed square is hollow', () => {
  render(<Tests />);
  const row = screen.getByRole('link', { name: 'flaky' }).closest<HTMLElement>('[role=row]')!;
  const strip = within(row).getByRole('img');
  expect(strip).toHaveAccessibleName('Last 4 runs, oldest first: Passed on retry, Passed, Passed, Failed');
  const rects = strip.querySelectorAll('rect');
  expect(rects).toHaveLength(4);
  expect(rects[3]).toHaveAttribute('fill', 'none'); // failed: 2px outline, empty centre
  expect(rects[0]).not.toHaveAttribute('fill', 'none');
});

it.each<[string, string]>([
  ['html', '<img src=x onerror=alert(1)> <b>bold</b>'],
  ['long', 'checkout › '.repeat(60) + 'applies coupon'],
  ['rtl', 'اختبار › تسجيل الدخول'],
  ['emoji', '🔥 checkout › 👩‍💻 applies coupon 🎉'],
])('%s names render as plain text, truncated with the full name on hover', (_, name) => {
  const ds = buildDataset([{ commit: 'a', tests: { [name]: ['fail', 'pass'] as AttemptStatus[] } }]);
  load(ds);
  render(<Tests />);
  const link = screen.getByRole('link', { name });
  expect(link.textContent).toBe(name);
  expect(link).toHaveAttribute('title', name);
  expect(link.className).toContain('truncate');
  expect(document.querySelector('img[src=x], b')).toBeNull();
});

it('status tabs show counts, sync to ?status= and disable empty ones', async () => {
  render(<Tests />);
  const tabs = screen.getByRole('group', { name: 'Filter by status' });
  expect(within(tabs).getByRole('button', { name: /All\s*4/ })).toHaveAttribute('aria-pressed', 'true');
  expect(within(tabs).getByRole('button', { name: /Unproven\s*0/ })).toBeDisabled();
  await userEvent.click(within(tabs).getByRole('button', { name: /Flaky\s*1/ }));
  await waitFor(() => expect(window.location.hash).toBe('#/tests?status=flaky'));
  await waitFor(() => expect(within(tabs).getByRole('button', { name: /Flaky\s*1/ })).toHaveAttribute('aria-pressed', 'true'));
  expect(screen.queryByRole('link', { name: 'failing' })).toBeNull();
  expect(screen.getByRole('status', { name: '' })).toBeDefined();
  expect(screen.getByText('Showing 1 Flaky test, grouped by status, most urgent first')).toBeInTheDocument();
});

it('search filters by name or file, syncs to ?q= and "/" focuses it', async () => {
  render(<Tests />);
  await userEvent.keyboard('/');
  const box = screen.getByRole('searchbox', { name: 'Search tests and files' });
  expect(box).toHaveFocus();
  await userEvent.type(box, 'fail');
  await waitFor(() => expect(window.location.hash).toBe('#/tests?q=fail'));
  expect(screen.getByText('Showing 1 test matching "fail", grouped by status, most urgent first')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'flaky' })).toBeNull();
  expect(screen.getByRole('link', { name: 'failing' })).toBeInTheDocument();
});

it('the health box gives counts, the distribution bar label and wasted time', () => {
  render(<Tests />);
  const box = screen.getByRole('region', { name: 'Test health' });
  expect(box).toHaveTextContent('4 tests · 4 runs');
  expect(within(box).getByRole('img')).toHaveAccessibleName(
    'Status of 4 tests: 1 Flaky, 0 Unproven, 1 Failing, 1 Stable, 1 Not enough data',
  );
  expect(box).toHaveTextContent('Wasted CI time');
  expect(within(box).queryByRole('link', { name: /not imported/ })).toBeNull();
});

it('focused rows are never hidden under the sticky header (scroll padding)', () => {
  render(<Tests />);
  const scroller = screen.getByRole('table').parentElement!;
  expect(scroller.style.scrollPaddingTop).toBe(`${HEADER_PX + BAND_PX}px`);
});

it('5,000 tests: only the visible rows are in the page', async () => {
  const runs = Array.from({ length: 4 }, (_, r) => ({
    commit: `c${r >> 1}`,
    tests: Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [`t${i}`, [(i + r) % 3 ? 'pass' : 'fail'] as AttemptStatus[]])),
  }));
  load(buildDataset(runs));
  render(<Tests />);
  const rendered = screen.getAllByRole('row').length;
  expect(rendered).toBeGreaterThan(5);
  expect(rendered).toBeLessThan(100);
  expect(screen.getByRole('table')).toHaveAttribute('aria-rowcount');
});

it('sample mode shows the sample banner with Exit sample', () => {
  load(fixture(), 'sample');
  render(<Tests />);
  expect(screen.getByText('Sample data. Start with the top 3 Flaky tests.')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'see why' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Exit sample' })).toBeInTheDocument();
});

it('focusing a row scrolls the whole row clear of the sticky header', () => {
  render(<Tests />);
  const link = screen.getByRole('link', { name: 'flaky' });
  const row = link.closest<HTMLElement>('.ranked-row')!;
  const calls: unknown[] = [];
  row.scrollIntoView = (arg?: boolean | ScrollIntoViewOptions) => void calls.push(arg);
  link.focus();
  expect(calls).toEqual([{ block: 'nearest' }]);
});

it('the health box says it counts all tests, because the tabs follow the search and the box does not', async () => {
  render(<Tests />);
  const box = screen.getByRole('region', { name: 'Test health' });
  expect(within(box).getByText('All 4 tests')).toBeInTheDocument();
  await userEvent.type(screen.getByRole('searchbox'), 'zzzz');
  expect(within(screen.getByRole('region', { name: 'Test health' })).getByText('All 4 tests')).toBeInTheDocument();
});

it('the health line is "{tests} tests · {runs} runs": files and commits live on Loaded data', () => {
  render(<Tests />);
  const box = screen.getByRole('region', { name: 'Test health' });
  expect(within(box).getByText('4 tests · 4 runs')).toBeInTheDocument();
  expect(box).not.toHaveTextContent(/files|commits/);
});

it('the status legend row is gone from the health box: the tabs carry the dot and the count', () => {
  render(<Tests />);
  const box = screen.getByRole('region', { name: 'Test health' });
  for (const label of ['Flaky', 'Unproven', 'Failing', 'Stable', 'Not enough data']) expect(within(box).queryByText(label)).toBeNull();
  expect(within(box).getByRole('img')).toHaveAccessibleName(/1 Flaky/); // the bar keeps one accessible name
});

it('the run-square key has no "Last 12 runs, oldest first:" prefix, but keeps the four names', () => {
  render(<Tests />);
  expect(screen.queryByText(/oldest first/)).toBeNull();
  for (const name of ['Passed', 'Passed on retry', 'Failed', 'Skipped']) expect(screen.getAllByText(name).length).toBeGreaterThan(0);
});

it('"Showing n tests..." is for screen readers only', () => {
  render(<Tests />);
  const line = screen.getByText('Showing all 4 tests, grouped by status, most urgent first');
  expect(line).toHaveClass('sr-only');
  expect(line.closest('[role="status"]')).not.toBeNull();
});
