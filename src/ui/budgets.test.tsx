import 'fake-indexeddb/auto';
import { it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { t, type CopyKey } from './copy';
import { clearAll as clearDb } from './data/db';
import { parseFiles } from './data/worker';
import { useStore } from './data/store';
import { App } from './App';
import { StorageBanner } from './components/StorageBanner';

vi.mock('./data/parser', () => ({
  workerParser: () => ({ parseFiles: async (...a: Parameters<typeof parseFiles>) => parseFiles(...a), terminate: () => {} }),
}));

// WORD BUDGETS (rule 3 of docs/ux/12-simplification-pass.md): visible UI text above the first data row, excluding the
// row content. Start 40, Tests 60, Loaded data 60, detail panel 90, any dialog 45, any banner or toast 20.
//
// COUNTING RULE. Counted: the words of the screen's explanatory and data text (headings, paragraphs, captions, numbers,
// banner and dialog sentences) in document order, up to the first data row (a table row, a file row, a run row).
// Not counted: the global header (shared chrome); the names of controls (button, link, summary and field labels: they
// name an action, they do not explain); screen-reader-only text (.sr-only); hidden elements; the content of <details>
// (reference text behind a summary); the lines of a code diff (row content); title attributes (tooltips); script and
// style. A word is a run of non-space characters, so "211 tests · 12 runs" is 5 words ("·" counts).
// `withControls` also counts the control names, to show the figure without that exclusion.
function words(root: Element, opts: { stopAt?: string; withControls?: boolean } = {}): number {
  const stop = opts.stopAt ? root.querySelector(opts.stopAt) : null;
  let n = 0;
  const walk = (el: Node): boolean => {
    if (el === stop) return false;
    if (el.nodeType === Node.TEXT_NODE) {
      n += (el.textContent ?? '').split(/\s+/).filter(Boolean).length;
      return true;
    }
    if (!(el instanceof HTMLElement)) return true;
    if (el.classList.contains('sr-only') || el.hidden || ['SCRIPT', 'STYLE', 'HEADER', 'DETAILS'].includes(el.tagName)) return true;
    if (el.getAttribute('role') === 'group' && el.getAttribute('aria-label')?.startsWith('Latest failure as a diff')) return true;
    if (!opts.withControls && ['BUTTON', 'A', 'SUMMARY', 'LABEL', 'KBD'].includes(el.tagName)) return true;
    for (const child of el.childNodes) if (!walk(child)) return false;
    return true;
  };
  walk(root);
  return n;
}
const sentence = (key: CopyKey, params: Record<string, string | number> = {}) => t(key, params).split(/\s+/).filter(Boolean).length;

// jsdom has no layout; give the virtual list a viewport so the rows render (same stand-in as Tests.test.tsx).
const PROPS = { clientHeight: 800, clientWidth: 1200, offsetHeight: 56, offsetWidth: 1200 } as const;
beforeAll(() => {
  for (const [k, v] of Object.entries(PROPS)) Object.defineProperty(HTMLElement.prototype, k, { configurable: true, get: () => v });
});

// panel: 90 for a panel without a cause block, 105 for one with it (UI/UX, DEV-38 follow-up; the failure meta line is
// "Run {n} · attempt {a} of {total}").
// report and exportMenu (proposed in DEV-42, to be confirmed by UI/UX): the report preview above the first Top Flaky test (measured 57), and the open Export menu (3 words of text, 20 with the control names).
// full (proposed in DEV-41, to be confirmed by UI/UX): the full test page above the first timeline row, status note and cause block included; measured 77 to 78.
const BUDGET = { start: 40, tests: 60, loaded: 60, panel: 90, panelWithCause: 105, full: 90, report: 70, exportMenu: 20, dialog: 45, banner: 20 } as const;
const report: string[] = [];
const check = (screenName: string, state: string, root: Element, budget: number, stopAt?: string) => {
  const n = words(root, { stopAt });
  report.push(`${screenName} / ${state}: ${n} words (${words(root, { stopAt, withControls: true })} with control names), budget ${budget}`);
  expect(n, `${screenName} / ${state}`).toBeLessThanOrEqual(budget);
};

const lab = (f: string) => new File([readFileSync(`fixtures/lab/${f}`, 'utf8')], f);
const pw = (f: string) => new File([readFileSync(`fixtures/playwright/${f}`, 'utf8')], f);
const initial = useStore.getState();
const labels = Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => [`run-0${i}.json`, `c${i}`]));
const own = async (extra: File[] = []) => {
  await useStore.getState().restore();
  await useStore.getState().importFiles([...[0, 1, 2, 3, 4, 5].map((i) => lab(`run-0${i}.json`)), ...extra], labels);
};
const show = async (hash: string, ready: () => Promise<unknown>) => {
  window.location.hash = hash;
  render(<App />);
  await ready();
};

beforeEach(async () => {
  await clearDb();
  useStore.setState(initial, true);
  window.location.hash = '#/';
  vi.stubGlobal('fetch', async (url: string) => new Response(readFileSync(`public/${url}`, 'utf8')));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
afterAll(() => console.log(['WORD COUNTS', ...report].join('\n')));

it('Start stays within 40 words', async () => {
  await show('#/', () => screen.findByRole('heading', { level: 1, name: 'Find your flaky tests' }));
  check('Start', 'empty', document.body, BUDGET.start);
  cleanup();
  await useStore.getState().restore();
  await useStore.getState().importFiles([pw('wrong-format.json')]);
  await show('#/', () => screen.findByRole('heading', { level: 1, name: 'Find your flaky tests' }));
  // The failure card is feedback about one file, not screen chrome: measured and reported, not held to the budget.
  report.push(`Start / after a failed file (reported, not asserted): ${words(document.body)} words`);
});

it('Tests stays within 60 words above the first row: sample data and own data', async () => {
  await show('#/', () => screen.findByRole('heading', { level: 1 }));
  await userEvent.click(screen.getByRole('button', { name: 'Try sample data' }));
  await screen.findByRole('table');
  check('Tests', 'sample data', document.body, BUDGET.tests, '.ranked-row');
  cleanup();
  useStore.setState(initial, true);
  await own();
  await show('#/tests', () => screen.findByRole('table'));
  check('Tests', 'own data', document.body, BUDGET.tests, '.ranked-row');
});

it('Loaded data stays within 60 words above the first file', async () => {
  await own([pw('partial-no-status.json')]);
  await show('#/data', () => screen.findByRole('heading', { level: 1, name: 'Loaded data' }));
  check('Loaded data', 'own data with a partial file', document.body, BUDGET.loaded, 'ul li');
});

it('the detail panel stays within 90 words (the diff lines are row content)', async () => {
  await own();
  await show('#/tests', () => screen.findByRole('table'));
  const first = await vi.waitFor(() => {
    const a = document.querySelector<HTMLAnchorElement>('a[data-test-id]');
    if (!a) throw new Error('no rows yet');
    return a;
  });
  window.location.hash = first.getAttribute('href')!; // jsdom does not follow the click on a hash link
  const panel = await vi.waitFor(() => {
    const aside = document.querySelector('aside');
    if (!aside) throw new Error('panel not open, hash ' + window.location.hash);
    return aside;
  });
  check('Detail panel', 'first test', panel, BUDGET.panel);
});

it.each(['flaky: low memory', 'flaky: strict locator'])('the detail panel of "%s", with a cause block, stays within 105 words', async (title) => {
  await own();
  await show('#/tests', () => screen.findByRole('table'));
  const link = await vi.waitFor(() => {
    const a = [...document.querySelectorAll<HTMLAnchorElement>('a[data-test-id]')].find((x) => x.textContent === title);
    if (!a) throw new Error('no row yet');
    return a;
  });
  window.location.hash = link.getAttribute('href')!;
  const panel = await vi.waitFor(() => {
    const aside = document.querySelector('aside');
    if (!aside) throw new Error('panel not open');
    return aside;
  });
  await vi.waitFor(() => {
    if (!panel.querySelector('[data-cause-tip]')) throw new Error('no cause block yet');
  });
  check('Detail panel', `${title} (with a cause block)`, panel, BUDGET.panelWithCause);
});

it.each(['flaky: low memory', 'flaky: strict locator'])('the full test page of "%s" stays within its budget above the first timeline row', async (title) => {
  await own();
  await show('#/tests', () => screen.findByRole('table'));
  const link = await vi.waitFor(() => {
    const a = [...document.querySelectorAll<HTMLAnchorElement>('a[data-test-id]')].find((x) => x.textContent === title);
    if (!a) throw new Error('no row yet');
    return a;
  });
  cleanup();
  window.location.hash = link.getAttribute('href')! + '/full';
  render(<App />);
  await screen.findByRole('table', { name: 'Run timeline' });
  await vi.waitFor(() => {
    if (!document.querySelector('[data-cause-tip]')) throw new Error('no cause block yet');
  });
  check('Full test page', title, document.querySelector('main')!, BUDGET.full, '[role=table] [role=row]:nth-child(2)');
});

it('the report page stays within its budget above the first Flaky test, and the Export menu within its own', async () => {
  await own();
  await show('#/report?scope=all', () => screen.findByRole('article', { name: 'FlakeLens report' }));
  check('Report', 'preview, own data', document.querySelector('main')!, BUDGET.report, 'ol > li');
  cleanup();
  await show('#/tests', () => screen.findByRole('table'));
  await userEvent.click(screen.getByRole('button', { name: 'Export' }));
  check('Export menu', 'open, current view', await screen.findByRole('menu', { name: 'Export' }), BUDGET.exportMenu);
});

it('every dialog stays within 45 words', async () => {
  await own();
  await show('#/data', () => screen.findByRole('heading', { level: 1, name: 'Loaded data' }));
  await userEvent.click(screen.getByRole('button', { name: 'Clear all data' }));
  check('Dialog', 'Clear all data', await screen.findByRole('dialog', { name: 'Clear all data?' }), BUDGET.dialog);
  await userEvent.keyboard('{Escape}');
  await userEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts and help' }));
  check('Dialog', 'Keyboard shortcuts', await screen.findByRole('dialog', { name: 'Keyboard shortcuts' }), BUDGET.dialog);
  cleanup();
  await clearDb();
  useStore.setState(initial, true);
  await show('#/', () => screen.findByRole('heading', { level: 1 }));
  await userEvent.click(screen.getByRole('button', { name: 'Try sample data' }));
  await screen.findByRole('table');
  await userEvent.upload(document.querySelector('input[type=file]')!, [pw('valid-basic.json')]);
  check('Dialog', 'Leave sample data', await screen.findByRole('dialog', { name: 'Leave sample data?' }), BUDGET.dialog);
});

it('every banner and toast sentence stays within 20 words', () => {
  const texts: [CopyKey, Record<string, number>?][] = [
    ['storage.off'],
    ['storage.fail'],
    ['storage.skipped', { count: 2 }],
    ['tests.banner.sample'],
    ['toast.copyFailed'],
    ['panel.copySummary.done'],
    ['clear.done'],
    ['import.noCommit.many', { count: 3 }],
    ['import.success', { tests: 211, runs: 12 }],
    ['import.added', { newRuns: 3, tests: 211, runs: 12 }],
    ['import.partial', { tests: 211, runs: 12, count: 3 }],
  ];
  for (const [key, params] of texts) {
    const n = sentence(key, params);
    report.push(`Banner or toast / ${key}: ${n} words, budget ${BUDGET.banner}`);
    expect(n, key).toBeLessThanOrEqual(BUDGET.banner);
  }
});

it('the rendered storage banners stay within 20 words', () => {
  for (const state of [{ storage: 'off' as const }, { storage: 'ok' as const, skippedRows: 2 }]) {
    useStore.setState({ ...initial, mode: 'user', ...state });
    const { unmount, container } = render(<StorageBanner />);
    check('Banner', JSON.stringify(state), container, BUDGET.banner);
    unmount();
  }
});
