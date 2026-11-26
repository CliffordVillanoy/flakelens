import 'fake-indexeddb/auto';
import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAll as clearDb } from '../data/db';
import { parseFiles } from '../data/worker';
import { useStore } from '../data/store';
import { getPref, setPref } from '../lib/prefs';
import { applyTheme } from '../lib/theme';
import { DEFAULT_CONFIG } from '@/engine/config';
import { App } from '../App';
import pkg from '../../../package.json';

vi.mock('../data/parser', () => ({
  workerParser: () => ({ parseFiles: async (...a: Parameters<typeof parseFiles>) => parseFiles(...a), terminate: () => {} }),
}));

const initial = useStore.getState();
const lab = (f: string) => new File([readFileSync(`fixtures/lab/${f}`, 'utf8')], f);
const open = async (withData = true) => {
  await useStore.getState().restore();
  if (withData) await useStore.getState().importFiles([lab('run-00.json'), lab('run-01.json')]);
  window.location.hash = '#/settings';
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: 'Settings' });
};

beforeEach(async () => {
  await clearDb();
  window.localStorage.clear();
  applyTheme();
  useStore.setState(initial, true);
  window.location.hash = '#/';
  vi.stubGlobal('fetch', async (url: string) => new Response(readFileSync(`public/${url}`, 'utf8')));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('is a page with four sections and a way back', async () => {
  await open();
  for (const name of ['Appearance', 'How rankings are decided', 'Your data', 'About']) {
    expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
  }
  expect(screen.getByRole('link', { name: 'Back to tests' })).toHaveAttribute('href', '#/tests');
  expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull(); // the header link is not repeated here
});

it('theme is a segmented group; a choice applies at once, is saved and moves the header logo', async () => {
  await open();
  const user = userEvent.setup();
  const group = screen.getByRole('group', { name: 'Theme' });
  expect(within(group).getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
  await user.click(within(group).getByRole('button', { name: 'Light' }));
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(getPref('theme', 'dark')).toBe('light');
  expect(within(group).getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('img', { name: 'FlakeLens' })).toHaveAttribute('src', expect.stringContaining('flakelens-light.svg'));
});

it('row density is saved, and the Tests screen uses it', async () => {
  await open();
  const user = userEvent.setup();
  const group = screen.getByRole('group', { name: 'Row density' });
  expect(within(group).getByRole('button', { name: 'Comfortable' })).toHaveAttribute('aria-pressed', 'true');
  await user.click(within(group).getByRole('button', { name: 'Compact' }));
  expect(getPref('density', 'comfortable')).toBe('compact');
  window.location.hash = '#/tests';
  await screen.findByRole('heading', { level: 1, name: 'Tests ranked by fix priority' });
  await waitFor(() => expect(document.querySelector('[data-density]')).toHaveAttribute('data-density', 'compact'));
});

it('a saved density choice from before keeps working, and the Tests toolbar no longer has the control', async () => {
  setPref('density', 'compact');
  await open();
  expect(within(screen.getByRole('group', { name: 'Row density' })).getByRole('button', { name: 'Compact' })).toHaveAttribute('aria-pressed', 'true');
  window.location.hash = '#/tests';
  await screen.findByRole('heading', { level: 1, name: 'Tests ranked by fix priority' });
  expect(screen.queryByRole('group', { name: 'Row density' })).toBeNull();
  expect(document.querySelector('[data-density]')).toHaveAttribute('data-density', 'compact');
});

it('the single-key shortcuts switch is named by its label, on by default, and saves; the keys are a tooltip', async () => {
  await open();
  const user = userEvent.setup();
  const sw = screen.getByRole('switch', { name: 'Single-key shortcuts' });
  expect(sw).toHaveAttribute('aria-checked', 'true');
  expect(sw.closest('[title]') ?? sw).toHaveAttribute('title', expect.stringContaining('j, k'));
  await user.click(sw);
  expect(sw).toHaveAttribute('aria-checked', 'false');
  expect(getPref('shortcuts', true)).toBe(false);
  await user.click(sw);
  expect(getPref('shortcuts', false)).toBe(true);
});

it('rule 8: no helper lines under Theme, density, shortcuts, data or About', async () => {
  await open();
  for (const gone of [
    'Dark is the default.',
    'Comfortable shows the file path under each test name.',
    'work when you are not typing in a field',
    'Saved in this browser. Clear all data keeps these choices.',
    'Everything stays in this browser. Nothing is uploaded.',
    'Your files stay in this browser. FlakeLens makes no network requests.',
  ]) {
    expect(screen.queryByText(gone, { exact: false })).toBeNull();
  }
});

it('the thresholds are read-only, closed by default, with the one-line note shown', async () => {
  await open();
  const user = userEvent.setup();
  expect(screen.getByText('These are starting values, not calibrated yet.')).toBeInTheDocument();
  const details = screen.getByText('Show thresholds').closest('details')!;
  expect(details.open).toBe(false);
  await user.click(screen.getByText('Show thresholds'));
  expect(details.open).toBe(true);
  const rate = Math.round(DEFAULT_CONFIG.failingRate * 100);
  expect(within(details).getByText(`Fails ${rate}% or more of its last ${DEFAULT_CONFIG.failingWindow} runs.`)).toBeInTheDocument();
  expect(within(details).getByText(/switches between pass and fail at least 2 times in 10/)).toBeInTheDocument();
  expect(within(details).getByText(/Fewer than 3 attempts, unless it passed on retry/)).toBeInTheDocument();
  expect(within(details).getByText(/More than half of its records are unclear/)).toBeInTheDocument();
  expect(within(details).queryByRole('textbox')).toBeNull();
  expect(within(details).queryByText('failingRate')).toBeNull(); // the config name is a tooltip, not a column
  expect(details.querySelector('[title="failingRate"]')).not.toBeNull();
});

it('Your data shows the summary and Clear all data opens the existing dialog', async () => {
  await open();
  expect(screen.getByText(/2 files · 2 runs · last added/)).toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Clear all data' }));
  const dialog = await screen.findByRole('dialog', { name: 'Clear all data?' });
  await user.click(within(dialog).getByRole('button', { name: 'Clear all data' }));
  await waitFor(() => expect(useStore.getState().dataset.runs).toHaveLength(0));
  expect(window.location.hash).toBe('#/');
});

it('About shows the version from package.json and four links that open a new tab safely', async () => {
  await open();
  expect(screen.getByText(`FlakeLens ${pkg.version}`)).toBeInTheDocument();
  const base = 'https://github.com/CliffordVillanoy/flakelens';
  const links: [string, string][] = [
    ['Source code', base],
    ['Report an issue', `${base}/issues/new/choose`],
    ['Security policy', `${base}/security/policy`],
    ['MIT licence', `${base}/blob/main/LICENSE`],
  ];
  for (const [name, href] of links) {
    const a = screen.getByRole('link', { name });
    expect(a).toHaveAttribute('href', href);
    expect(a).toHaveAttribute('target', '_blank');
    expect(a).toHaveAttribute('rel', 'noopener noreferrer');
  }
});

it('works with no data loaded: Back goes to Start and Clear all data is off', async () => {
  await open(false);
  expect(screen.getByRole('link', { name: 'Back to tests' })).toHaveAttribute('href', '#/');
  expect(screen.getByRole('button', { name: 'Clear all data' })).toBeDisabled();
});
