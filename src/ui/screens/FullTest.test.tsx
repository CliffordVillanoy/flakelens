import { it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import type { Dataset } from '@/engine/types';
import { useStore } from '../data/store';
import { buildGroups, type Fail } from '../data/groupsFixture';
import { FullTest } from './FullTest';

const PROPS = { clientHeight: 800, clientWidth: 1200, offsetHeight: 56, offsetWidth: 1200 } as const;
const real = Object.fromEntries(Object.keys(PROPS).map((k) => [k, Object.getOwnPropertyDescriptor(HTMLElement.prototype, k)]));
beforeAll(() => {
  for (const [k, v] of Object.entries(PROPS)) Object.defineProperty(HTMLElement.prototype, k, { configurable: true, get: () => v });
});
afterAll(() => {
  for (const [k, d] of Object.entries(real)) if (d) Object.defineProperty(HTMLElement.prototype, k, d);
});

const initial = useStore.getState();
const load = (ds: Dataset) => useStore.setState({ ...initial, mode: 'user', dataset: ds, ranked: rankTests(scoreTests(ds), ds.tests) }, true);
const FAKE = 'FAKE-TOKEN-NOT-A-SECRET-000000';
const REFUSED = (n: number) => `page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:${40000 + n}/api/x${n}\nauthorization: Bearer ${FAKE}`;
const OTHER = (n: number) => `Error: expect(received).toBe(expected) // Object.is equality\n\nExpected: ${n}\nReceived: ${n + 1}`;

const fixture = () => {
  const ds = buildGroups([
    ...Array.from({ length: 4 }, (_, i): Fail => ({ run: i, test: 'net', message: REFUSED(i), stack: `Error: x\n    at /repo/tests/net.spec.ts:${10 + i}:3` })),
    ...Array.from({ length: 3 }, (_, i): Fail => ({ run: i + 1, test: 'plain', message: OTHER(i) })),
    { run: 0, test: 'silent', message: '' },
  ]);
  // a test that never failed, and passing attempts for the others so the timeline has passes too
  ds.tests.push({ testId: 'green', testKey: 'green', file: 'a.spec.ts', suitePath: ['checkout'], title: 'green', project: '' });
  ds.runs.forEach((r, i) => ds.attempts.push({ attemptId: `g${i}`, runId: r.runId, testId: 'green', repeatIndex: 0, retryIndex: 0, status: 'pass', durationMs: 500 }));
  ds.runs.forEach((r, i) => ds.attempts.push({ attemptId: `p${i}`, runId: r.runId, testId: 'net', repeatIndex: 0, retryIndex: 1, status: 'pass', durationMs: 700 }));
  return ds;
};

const open = async (id: string, query = '') => {
  window.location.hash = `#/tests/${encodeURIComponent(id)}/full${query}`;
  render(<FullTest testId={id} query={new URLSearchParams(query.replace(/^\?/, ''))} />);
  return screen.findByRole('heading', { level: 1 });
};

beforeEach(() => {
  load(fixture());
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } });
});

it('shows the test name, its status, the three stat tiles and the sections in order', async () => {
  const h1 = await open('net');
  expect(h1).toHaveTextContent('checkout › net');
  expect(screen.getByText('Flaky')).toBeInTheDocument();
  const tiles = screen.getByRole('group', { name: 'Stats' });
  expect(within(tiles).getAllByText(/attempts failed|passed on retry|wasted time/)).toHaveLength(3);
  expect(within(tiles).getByText('4 of 12')).toBeInTheDocument();
  const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
  expect(headings).toEqual(['Run timeline', 'Failure log', 'What it depends on']);
});

it('back to tests keeps the list filters in its link', async () => {
  await open('net', '?status=flaky&q=net');
  expect(screen.getByRole('link', { name: 'Back to tests' })).toHaveAttribute('href', '#/tests?status=flaky&q=net');
  expect(screen.getByRole('link', { name: 'Back to tests' })).not.toHaveAttribute('href', '#/tests/net');
});

it('copy test name puts the full name on the clipboard', async () => {
  await open('net');
  await userEvent.click(screen.getByRole('button', { name: 'Copy test name' }));
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('checkout › net');
});

it('the run timeline lists the runs newest first with the file name, commit and result words', async () => {
  await open('net');
  const table = screen.getByRole('table', { name: 'Run timeline' });
  expect(within(table).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Run', 'Commit', 'When', 'Result', 'Time']);
  const rows = within(table).getAllByRole('row').slice(1);
  expect(rows).toHaveLength(5); // the first five; the rest are behind Show all
  expect(rows[0]).toHaveTextContent('run-7.json');
  expect(rows[0]).toHaveTextContent('Passed');
  expect(rows.find((r) => r.textContent!.includes('run-3.json'))).toHaveTextContent('Failed, then passed on retry');
  await userEvent.click(screen.getByRole('button', { name: 'Show all 8 runs' }));
  expect(within(table).getAllByRole('row').slice(1)).toHaveLength(8);
});

it('a run name in the timeline picks that run in the log', async () => {
  await open('net');
  await userEvent.click(screen.getByRole('button', { name: 'Show all 8 runs' }));
  await userEvent.click(screen.getByRole('button', { name: 'Show the log of run-1.json' }));
  expect(screen.getByRole('combobox', { name: 'Choose a run' })).toHaveDisplayValue('Run run-1.json, attempt 1');
});

it('the log opens on the newest failure; the quoted evidence is a chip and a highlighted line; a chip jumps to its line', async () => {
  await open('net');
  const region = await screen.findByRole('region', { name: /^Log for checkout › net, Run run-3\.json, attempt 1$/ });
  const chip = (await screen.findAllByRole('button', { name: /Quoted from the log · line \d+/ }))[0]!;
  expect(region.querySelector('[data-evidence] mark')).not.toBeNull();
  await userEvent.click(chip);
  expect(document.activeElement).toHaveAttribute('data-line');
  expect(document.activeElement!.closest('[role=region]')).toBe(region);
});

it('the fake token never reaches the page: not in a row, a chip, the picker, or the copied line', async () => {
  await open('net');
  await screen.findAllByRole('button', { name: /Quoted from the log/ });
  expect(document.body.innerHTML).not.toContain('FAKE-TOKEN');
  expect(document.body.textContent).toContain('[redacted]');
  const region = screen.getByRole('region', { name: /Log for/ });
  const row = [...region.querySelectorAll('[data-line]')].find((r) => r.textContent!.includes('[redacted]')) as HTMLElement;
  await userEvent.click(row);
  await userEvent.click(screen.getByRole('button', { name: 'Copy line' }));
  const copied = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string).join('\n');
  expect(copied).toContain('Bearer [redacted]');
  expect(copied).not.toContain('FAKE-TOKEN');
});

it('correlations: a dataset with no browser, shard, OS or start-time spread shows calm "not in your files" boxes, never a finding', async () => {
  await open('net');
  const section = screen.getByRole('region', { name: 'What it depends on' });
  expect(within(section).getByText('No browser in your files.')).toBeInTheDocument();
  expect(within(section).getByText('No shard in your files.')).toBeInTheDocument();
  expect(within(section).getByText('No operating system in your files.')).toBeInTheDocument();
  expect(within(section).getByText('Only one project in your files.')).toBeInTheDocument();
  expect(section).not.toHaveTextContent(/Fails more on|Strong|Moderate|Weak/);
  expect(section.textContent).not.toMatch(/corr\.|lead/i);
});

it('a test that never failed says so, with no log and no chips', async () => {
  await open('green');
  expect(screen.getByText('No failures in the loaded runs')).toBeInTheDocument();
  expect(screen.getByText('The failure log and its evidence appear when this test fails.')).toBeInTheDocument();
  expect(screen.queryByRole('searchbox')).toBeNull();
  expect(screen.queryByRole('combobox', { name: 'Choose a run' })).toBeNull();
});

it('a failed attempt with no message says this run has no log text', async () => {
  await open('silent');
  expect(screen.getByText('This run has no log text')).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: /Log for/ })).toBeNull();
});

it('a test that is not in the data offers the way back', async () => {
  window.location.hash = '#/tests/nope/full';
  render(<FullTest testId="nope" query={new URLSearchParams()} />);
  expect(await screen.findByText("This test isn't in the loaded data")).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to tests' })).toHaveAttribute('href', '#/tests');
});

it('focus lands on the page title when the page opens', async () => {
  const h1 = await open('net');
  await waitFor(() => expect(document.activeElement).toBe(h1));
});

it('rule 8: no lead sentence under the section headings and no helper line under the stats', async () => {
  await open('net');
  for (const h of screen.getAllByRole('heading', { level: 2 })) {
    const next = h.nextElementSibling;
    expect(next === null || next.tagName !== 'P').toBe(true);
  }
});
