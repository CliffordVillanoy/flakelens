import 'fake-indexeddb/auto';
import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAll as clearDb } from './data/db';
import { ImportTimeout } from './data/importer';
import { parseFiles } from './data/worker';
import { useStore } from './data/store';
import { App } from './App';

const parserMode = vi.hoisted(() => ({ current: 'direct' as 'direct' | 'timeout' | 'crash' }));
vi.mock('./data/parser', () => ({
  workerParser: () => ({
    parseFiles: async (...a: Parameters<typeof parseFiles>) => {
      if (parserMode.current === 'timeout') throw new ImportTimeout(a[0][0]!.name);
      if (parserMode.current === 'crash') throw new Error('worker died');
      return parseFiles(...a);
    },
    terminate: () => {},
  }),
}));

const pw = (f: string) => new File([readFileSync(`fixtures/playwright/${f}`, 'utf8')], f);
const lab = (f: string) => new File([readFileSync(`fixtures/lab/${f}`, 'utf8')], f);
const raw = (name: string, json: unknown) => new File([JSON.stringify(json)], name);
const report = (specs: unknown[], stats: unknown = {}) => ({
  config: {},
  stats,
  suites: [{ title: 'a.spec.ts', file: 'a.spec.ts', specs, suites: [] }],
});
const spec = (title: string) => ({ title, tests: [{ projectName: 'chromium', results: [{ status: 'passed', retry: 0, duration: 5 }] }] });
const initial = useStore.getState();

beforeEach(async () => {
  await clearDb();
  useStore.setState(initial, true);
  parserMode.current = 'direct';
  window.location.hash = '#/';
  vi.stubGlobal('fetch', async (url: string) => new Response(readFileSync(`public/${url}`, 'utf8')));
});
afterEach(() => vi.unstubAllGlobals());

const start = async () => {
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: 'Find your flaky tests' });
};
const upload = async (...files: File[]) =>
  userEvent.upload(document.querySelector<HTMLInputElement>('input[type=file]')!, files);
const onTests = () => waitFor(() => expect(window.location.hash).toBe('#/tests'));
// The first sentence and the reason render as separate lines, so match sentence by sentence.
const hasSentences = (el: HTMLElement, message: string) =>
  message.split(/(?<=\.) /).forEach((part) => expect(el).toHaveTextContent(part));
const banner = () => screen.findByRole('status', { name: /import result/i });

it('Start shows the board 1 content', async () => {
  await start();
  expect(screen.getByText(/A flaky test passes and fails on the same code/)).toBeInTheDocument();
  const zone = screen.getByRole('region', { name: 'Import reports' });
  expect(within(zone).getByText('Drop Playwright JSON reports here')).toBeInTheDocument();
  expect(within(zone).getByRole('button', { name: 'Browse files' })).toBeInTheDocument();
  expect(within(zone).getByRole('button', { name: 'Try sample data' })).toBeInTheDocument();
  expect(screen.getByText('Your files stay in this browser. Nothing is uploaded.')).toBeInTheDocument();
  expect(screen.getByText('How do I get a Playwright JSON report?')).toBeInTheDocument();
  expect(screen.getByText('npx playwright test --reporter=json > results.json')).toBeInTheDocument();
  expect(screen.getByText('--repeat-each=5').tagName).toBe('CODE');
  const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
  expect(input.multiple).toBe(true);
  expect(input.accept).toContain('.json');
});

// Spec 9.1, one row each.
it('valid file: "Imported N tests from M runs."', async () => {
  await start();
  await upload(pw('valid-basic.json'));
  await onTests();
  expect(await banner()).toHaveTextContent('Imported 3 tests from 1 run.');
});

it('missing status, name and duration: counts first, then the examples, View all and Download', async () => {
  await start();
  await upload(pw('partial-no-status.json'), pw('partial-no-name.json'), pw('bad-duration.json'));
  await onTests();
  const b = await banner();
  expect(b).toHaveTextContent(/^Imported \d+ tests from 3 runs\. 2 results were not imported\./);
  expect(b).toHaveTextContent('1 result had no status: "adds item" (run partial-no-status.json)');
  expect(b).toHaveTextContent('1 test had no name (run partial-no-name.json, position 3)');
  expect(b).toHaveTextContent('1 results had an unreadable duration. They were kept without it.');
  expect(within(b).getAllByRole('listitem')).toHaveLength(3); // up to 3 examples
  expect(within(b).getByRole('link', { name: 'View all notices' })).toHaveAttribute('href', '#/data');
  expect(within(b).getByRole('button', { name: 'Download not-imported list' })).toBeInTheDocument();
});

it('same run twice and missing commit info show their notices', async () => {
  await start();
  await upload(pw('valid-basic.json'), pw('valid-basic.json'));
  await onTests();
  const b = await banner();
  expect(b).toHaveTextContent("This run was already loaded, so it wasn't counted twice.");
  expect(b).toHaveTextContent('No commit info found in valid-basic.json. Evidence across commits will be limited.');
});

it('duplicate test IDs and an unreadable start date show their notices', async () => {
  await start();
  await upload(raw('dupes.json', report([spec('same'), spec('same')], { startTime: 'not a date' })));
  await onTests();
  const b = await banner();
  expect(b).toHaveTextContent('1 tests shared a name. They were told apart by project name and position.');
  expect(b).toHaveTextContent("dupes.json: the run start time couldn't be read, so this run keeps its import order.");
});

it('hostile names render as text', async () => {
  await start();
  const evil = '<img src=x onerror=alert(1)>';
  await upload(raw('evil2.json', report([{ title: evil, tests: [{ projectName: 'c', results: [{ retry: 0 }, { status: 'passed', retry: 1 }] }] }, spec('z')])));
  await onTests();
  expect(await banner()).toHaveTextContent(`1 result had no status: "${evil}"`);
  expect(document.querySelector('img[src=x]')).toBeNull();
});

it.each([
  ['wrong-format.json', "wrong-format.json wasn't imported. It isn't a Playwright JSON report."],
  ['empty.json', "empty.json couldn't be read. It may be cut off. Try downloading it again."],
  ['truncated.json', "truncated.json couldn't be read."],
  ['mostly-bad.json', "mostly-bad.json wasn't imported. Too much of it was unclear to rank tests reliably."],
  ['deep-nesting.json', 'deep-nesting.json is larger than the 50 nested suites limit.'],
])('failed file %s: inline message, file name first, drop zone still active', async (f, message) => {
  await start();
  await upload(pw(f));
  const alert = await screen.findByRole('alert');
  hasSentences(alert, message);
  expect(within(alert).getByText(f).tagName).toBe('STRONG');
  expect(window.location.hash).toBe('#/');
  const zone = screen.getByRole('region', { name: 'Import reports' });
  expect(within(zone).getByRole('button', { name: 'Browse files' })).toBeEnabled();
});

it('one failed file in a drop: others still import, failure shows inline with the count of others', async () => {
  await start();
  await upload(pw('wrong-format.json'), pw('valid-basic.json'), pw('two-projects.json'));
  await onTests();
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent("wrong-format.json wasn't imported.");
  expect(screen.getByText('2 other files imported. You can drop another file here.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Browse files' })).toBeEnabled();
  expect(await banner()).toHaveTextContent(/Imported \d+ tests from 2 runs\./);
});

it('format failure offers format help on Start', async () => {
  await start();
  await upload(pw('wrong-format.json'));
  await userEvent.click(await screen.findByRole('button', { name: 'Which format do I need?' }));
  expect(screen.getByText('How do I get a Playwright JSON report?').closest('details')).toHaveAttribute('open');
});

it('timeout and crash keep the drop zone active', async () => {
  await start();
  parserMode.current = 'timeout';
  await upload(pw('valid-basic.json'));
  hasSentences(await screen.findByRole('alert'), "valid-basic.json took too long to read and wasn't imported. Try a smaller file or fewer runs.");
  parserMode.current = 'crash';
  await upload(pw('valid-basic.json'));
  await waitFor(() => hasSentences(screen.getByRole('alert'), 'Something went wrong while reading your files. Nothing was changed. Try again.'));
  expect(screen.getByRole('button', { name: 'Browse files' })).toBeEnabled();
  expect(useStore.getState().mode).toBe('empty');
});

it('sample: banner, Leave-sample dialog with focus on Stay, then own files replace the sample', async () => {
  await start();
  await userEvent.click(screen.getByRole('button', { name: 'Try sample data' }));
  await onTests();
  expect(await screen.findByText(/^Sample data: 9 tests from 13 runs\. 3 results were not imported/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Exit sample' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Add your files' }));
  await upload(pw('valid-basic.json'), pw('two-projects.json'));
  const dialog = await screen.findByRole('dialog', { name: 'Leave sample data?' });
  expect(dialog).toHaveTextContent('Your 2 files will be analysed on their own. Sample data is never mixed with your runs.');
  expect(within(dialog).getByRole('button', { name: 'Stay in sample' })).toHaveFocus();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Stay in sample' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(useStore.getState().mode).toBe('sample');

  await upload(pw('valid-basic.json'));
  await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Analyse my files' }));
  await waitFor(() => expect(useStore.getState().mode).toBe('user'));
  expect(useStore.getState().dataset.runs).toHaveLength(1);
  expect(await banner()).toHaveTextContent('Imported 3 tests from 1 run.');
});

it('Exit sample goes to Start when there is no data of your own', async () => {
  await start();
  await userEvent.click(screen.getByRole('button', { name: 'Try sample data' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Exit sample' }));
  await screen.findByRole('heading', { level: 1, name: 'Find your flaky tests' });
  expect(window.location.hash).toBe('#/');
  expect(useStore.getState().mode).toBe('empty');
});

it('Exit sample returns to your own data on Tests', async () => {
  await start();
  await upload(lab('run-00.json'));
  await onTests();
  await useStore.getState().startSample();
  await userEvent.click(await screen.findByRole('button', { name: 'Exit sample' }));
  await waitFor(() => expect(useStore.getState().mode).toBe('user'));
  expect(useStore.getState().dataset.runs).toHaveLength(1);
  expect(window.location.hash).toBe('#/tests');
});

it('opens on Tests when stored data exists', async () => {
  await useStore.getState().importFiles([lab('run-00.json')]);
  useStore.setState(initial, true);
  render(<App />);
  await onTests();
});
