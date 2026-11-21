import { it, expect, beforeEach, beforeAll, afterAll, afterEach, vi, onTestFinished } from 'vitest';
import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildDataset } from '@/engine/score/testkit';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import { runHistory } from '@/engine/view';
import type { AttemptStatus, Dataset } from '@/engine/types';
import { useStore } from '../data/store';
import { ShortcutsSheet } from '../components/ShortcutsSheet';
import { Toasts } from '../components/Toasts';
import { shortcutsSheet } from '../lib/shortcuts';
import { setPref } from '../lib/prefs';
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
// Adds a failure record for every failed attempt, the way the importer does.
const withFailures = (ds: Dataset): Dataset => ({
  ...ds,
  failures: ds.attempts
    .filter((a) => a.status === 'fail')
    .map((a) => ({ attemptId: a.attemptId, message: `TimeoutError in ${a.runId}`, stack: `at ${a.testId}.spec.ts:42:31` })),
});
const load = (ds: Dataset) => {
  const full = withFailures(ds);
  useStore.setState({ ...initial, mode: 'user', dataset: full, ranked: rankTests(scoreTests(full), full.tests) }, true);
  return full;
};
const S = (...s: AttemptStatus[]) => s;
const fixture = () =>
  buildDataset(
    [
      { commit: 'aaaaaaa1', tests: { flaky: S('pass'), failing: S('fail'), stable: S('pass') } },
      { commit: 'bbbbbbb2', tests: { flaky: S('fail', 'pass'), failing: S('fail'), stable: S('pass') } },
      { commit: 'bbbbbbb2', tests: { flaky: S('pass'), failing: S('fail'), stable: S('pass') } },
      { commit: 'ccccccc3', tests: { flaky: S('fail', 'fail'), failing: S('fail'), stable: S('pass') } },
    ],
    3100,
  );

beforeEach(() => {
  window.location.hash = '#/tests';
  load(fixture());
});
afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

const open = async (id: string) => {
  act(() => {
    window.location.hash = `#/tests/${id}`;
  });
  return screen.findByRole('complementary');
};

it('run history: one column per run from runHistory, with its spoken label and the mixed-commit outline', async () => {
  const ds = useStore.getState().dataset;
  render(<Tests />);
  const panel = await open('flaky');
  const list = within(panel).getByRole('list', { name: /Runs grouped by commit/ });
  const columns = within(list).getAllByRole('img');
  expect(columns).toHaveLength(runHistory(ds, 'flaky').length);
  expect(columns.map((c) => c.getAttribute('aria-label'))).toEqual([
    'Run 1, commit aaaaaaa: pass',
    'Run 2, commit bbbbbbb, mixed commit: fail, pass after retry',
    'Run 3, commit bbbbbbb, mixed commit: pass',
    'Run 4, commit ccccccc: fail, fail',
  ]);
  const groups = within(list).getAllByRole('listitem');
  expect(groups).toHaveLength(3); // runs grouped by commit
  expect(groups[1]).toHaveAttribute('data-mixed', 'true');
  expect(groups[0]).toHaveAttribute('data-mixed', 'false');
  expect(within(panel).getByRole('heading', { name: 'Run history · 4 runs on 3 commits' })).toBeInTheDocument();
});

it('Failures only keeps the runs with a failed attempt', async () => {
  render(<Tests />);
  const panel = await open('flaky');
  await userEvent.selectOptions(within(panel).getByRole('combobox'), 'failures');
  expect(within(within(panel).getByRole('list', { name: /Runs grouped/ })).getAllByRole('img')).toHaveLength(2);
});

it('the panel shows the title, the pill, the same evidence sentence as the row, the file bar and the diffstat', async () => {
  render(<Tests />);
  const panel = await open('flaky');
  expect(within(panel).getByRole('heading', { level: 2, name: 'flaky' })).toBeInTheDocument();
  expect(within(panel).getByText('Flaky', { selector: '[data-pill]' })).toBeInTheDocument();
  expect(panel).toHaveTextContent('1 of 3 commits had both a pass and a fail');
  expect(panel).toHaveTextContent('x.spec.ts');
  expect(within(panel).getByRole('img', { name: '3 passed · 3 failed attempts' })).toBeInTheDocument();
  expect(panel).toHaveTextContent('1 of 3 shown');
});

it.each<[string, Dataset, string, string]>([
  ['flaky', fixture(), 'flaky', 'This test gave different results on the same code.'],
  ['failing', fixture(), 'failing', 'It fails almost every run.'],
  [
    'failing that was flaky, with its SHA',
    buildDataset([
      { commit: 'a1a1a1a', tests: { t: S('fail', 'pass') } },
      ...Array.from({ length: 10 }, () => ({ commit: 'f00dbabe9', tests: { t: S('fail') } })),
    ]),
    't',
    'It fails almost every run now. It was flaky before f00dbab.',
  ],
  ['stable with few runs', fixture(), 'stable', 'Nothing needed. With only 4 runs loaded, confidence is low.'],
  ['stable with 5+ runs', buildDataset(Array.from({ length: 6 }, () => ({ tests: { t: S('pass') } }))), 't', 'Nothing needed.'],
  ['not enough data', buildDataset([{ tests: { t: S('pass') } }]), 't', 'There is too little history to judge this test.'],
])('status note: %s', async (_, ds, id, text) => {
  load(ds);
  render(<Tests />);
  const panel = await open(id);
  const note = within(panel).getByRole('region', { name: 'What this means' });
  expect(note).toHaveTextContent(text);
  expect(note).toHaveTextContent('What to check next');
});

it('stable with 5+ runs drops the low-confidence line', async () => {
  load(buildDataset(Array.from({ length: 6 }, () => ({ tests: { t: S('pass') } }))));
  render(<Tests />);
  const panel = await open('t');
  expect(panel).not.toHaveTextContent('confidence is low');
});

it('latest failure: failed lines, the passing retry, previous failure, and it opens scrolled there', async () => {
  const scrolled: Element[] = [];
  // jsdom has no scrollIntoView; define a recording stand-in for this test.
  Element.prototype.scrollIntoView = function (this: Element) {
    scrolled.push(this);
  };
  onTestFinished(() => void delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView);
  render(<Tests />);
  const panel = await open('flaky');
  const failure = within(panel).getByRole('region', { name: 'Latest failure' });
  await waitFor(() => expect(scrolled).toContain(failure));
  expect(failure).toHaveTextContent('Run 4 · commit ccccccc · attempt 2 of 2');
  expect(failure).toHaveTextContent('TimeoutError in run3');
  expect(failure).not.toHaveTextContent('passed in');
  await userEvent.click(within(failure).getByRole('button', { name: 'Show previous failure' }));
  expect(failure).toHaveTextContent('Run 4 · commit ccccccc · attempt 1 of 2');
  await userEvent.click(within(failure).getByRole('button', { name: 'Show previous failure' }));
  expect(failure).toHaveTextContent('Run 2 · commit bbbbbbb · attempt 1 of 2');
  expect(failure).toHaveTextContent('Run 2 · attempt 1 failed, attempt 2 passed · same commit');
  expect(failure).toHaveTextContent('Attempt 2 passed in 3.1 s on the same commit.');
});

it('opening moves focus to the panel title; Esc and Close return it to the row', async () => {
  render(<Tests />);
  await userEvent.click(screen.getByRole('link', { name: 'flaky' }));
  const title = await screen.findByRole('heading', { level: 2, name: 'flaky' });
  await waitFor(() => expect(title).toHaveFocus());
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(window.location.hash).toBe('#/tests'));
  await waitFor(() => expect(screen.getByRole('link', { name: 'flaky' })).toHaveFocus());

  await userEvent.click(screen.getByRole('link', { name: 'failing' }));
  await userEvent.click(await screen.findByRole('link', { name: 'Close panel' }));
  await waitFor(() => expect(screen.getByRole('link', { name: 'failing' })).toHaveFocus());
});

it('j and k move through the shown tests, in the panel and in the list', async () => {
  render(<Tests />);
  const order = screen
    .getAllByRole('link')
    .filter((a) => a.getAttribute('href')?.startsWith('#/tests/') && !a.textContent?.startsWith('why?'))
    .map((a) => a.textContent!);
  screen.getByRole('link', { name: order[0] }).focus();
  await userEvent.keyboard('j');
  expect(screen.getByRole('link', { name: order[1] })).toHaveFocus();
  await userEvent.keyboard('k');
  expect(screen.getByRole('link', { name: order[0] })).toHaveFocus();
  await open(order[0]!);
  await userEvent.keyboard('j');
  await waitFor(() => expect(window.location.hash).toBe(`#/tests/${order[1]}`));
  await userEvent.click(await screen.findByRole('button', { name: 'Previous test' }));
  await waitFor(() => expect(window.location.hash).toBe(`#/tests/${order[0]}`));
});

it('single-key shortcuts never fire in a text field or when switched off; ? opens the shortcuts sheet hook', async () => {
  const sheet = vi.spyOn(shortcutsSheet, 'open');
  render(<Tests />);
  await open('flaky');
  const box = screen.getByRole('searchbox');
  box.focus();
  await userEvent.keyboard('jk?');
  expect(window.location.hash).toMatch(/^#\/tests\/flaky/); // typed into the search, so no j/k move; the panel stays open
  expect(sheet).not.toHaveBeenCalled();
  expect(box).toHaveValue('jk?');
  box.blur();
  setPref('shortcuts', false);
  const hash = window.location.hash;
  await userEvent.keyboard('j?');
  expect(window.location.hash).toBe(hash);
  expect(sheet).not.toHaveBeenCalled();
  setPref('shortcuts', true);
  await userEvent.keyboard('?');
  expect(sheet).toHaveBeenCalledTimes(1);
});

it('an unknown test id (old link) shows the missing-test state with Back to tests', async () => {
  window.location.hash = '#/tests/does-not-exist';
  render(<Tests />);
  expect(await screen.findByRole('heading', { name: "This test isn't in the loaded data" })).toBeInTheDocument();
  expect(screen.getByText('It may have been renamed, or its files were cleared.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to tests' })).toHaveAttribute('href', '#/tests');
});

it('Copy summary copies the plain-text template; a blocked clipboard shows an error toast that stays', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  render(
    <>
      <Tests />
      <Toasts />
    </>,
  );
  const panel = await open('flaky');
  await userEvent.click(within(panel).getByRole('button', { name: 'Copy summary' }));
  expect(writeText.mock.calls[0]![0]).toBe(
    [
      'flaky (x.spec.ts)',
      'Status: Flaky. 1 of 3 commits had both a pass and a fail.',
      'Wasted CI time: 0.1 min across 4 runs.',
      'Latest failure: run 4, commit ccccccc: TimeoutError in run3',
      'Analysed locally with FlakeLens. Likely cause, not proof.',
    ].join('\n'),
  );
  expect(await screen.findByText('Summary copied')).toBeInTheDocument();

  writeText.mockRejectedValue(new Error('NotAllowedError'));
  await userEvent.click(within(panel).getByRole('button', { name: 'Copy error message' }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent("Couldn't copy. Your browser blocked the clipboard.");
  await act(() => new Promise((r) => setTimeout(r, 50)));
  await userEvent.click(within(alert).getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByText("Couldn't copy. Your browser blocked the clipboard.")).toBeNull();
});

it('the Export copy shows the same error toast when the clipboard is blocked', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('x')) } });
  render(
    <>
      <Tests />
      <Toasts />
    </>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Export' }));
  await userEvent.click(screen.getByRole('menuitem', { name: /Copy top Flaky tests/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't copy. Your browser blocked the clipboard.");
});

it('Esc that closes the shortcuts sheet leaves the panel open', async () => {
  render(
    <>
      <Tests />
      <ShortcutsSheet />
    </>,
  );
  await userEvent.click(screen.getByRole('link', { name: 'flaky' }));
  const title = await screen.findByRole('heading', { level: 2, name: 'flaky' });
  await waitFor(() => expect(title).toHaveFocus());
  const before = window.location.hash;
  act(() => shortcutsSheet.open());
  const sheet = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
  fireEvent.keyDown(sheet, { key: 'Escape' }); // focus is inside the dialog in a browser, so the key starts there
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Keyboard shortcuts' })).toBeNull());
  expect(window.location.hash).toBe(before);
  expect(screen.getByRole('heading', { level: 2, name: 'flaky' })).toBeInTheDocument();
});
