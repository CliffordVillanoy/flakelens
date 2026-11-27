import { it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import type { Dataset } from '@/engine/types';
import { useStore } from '../data/store';
import { buildGroups, type Fail } from '../data/groupsFixture';
import { Tests } from './Tests';

// The cause tip and the highlighted evidence in the detail panel (DEV-38, board 12 part 3).
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
const STATUS = (n: number) => `Error: expect(received).toBe(expected) // Object.is equality\n\nExpected: 200\nReceived: 50${3 + n}`;

const fixture = () =>
  buildGroups([
    ...Array.from({ length: 4 }, (_, i): Fail => ({ run: i, test: 'net', message: REFUSED(i), stack: `Error: x\n    at /repo/tests/net.spec.ts:${10 + i}:3` })),
    ...Array.from({ length: 3 }, (_, i): Fail => ({ run: i + 1, test: 'plain', message: OTHER(i) })),
    // one group, two causes: 8 with no rule and 2 that read as a 503 (they look the same once numbers are masked)
    ...Array.from({ length: 8 }, (_, i): Fail => ({ run: i % 8, test: `mix${i}`, message: OTHER(100 + i) })),
    ...Array.from({ length: 2 }, (_, i): Fail => ({ run: 6 + i, test: `srv${i}`, message: STATUS(i) })),
  ]);

beforeEach(() => {
  load(fixture());
});

const openPanel = async (id: string) => {
  window.location.hash = `#/tests/${id}`;
  render(<Tests />);
  return screen.findByRole('complementary');
};

it('medium or high confidence: the note gets the likely cause, the confidence, the tip and a link to the group, below a divider', async () => {
  const panel = await openPanel('net');
  const cause = await within(panel).findByText('Likely cause: Network or external service');
  const box = cause.closest('section')!;
  expect(within(box).getByRole('heading', { level: 3 })).toBeInTheDocument(); // it is inside the status note box
  expect(box).toHaveTextContent('High confidence');
  expect(box).toHaveTextContent('Mock the call, or retry only that call.');
  const link = within(box).getByRole('link', { name: 'See the group of 4 failures' });
  expect(link.getAttribute('href')).toMatch(/^#\/groups\?g=[0-9a-f]{14}$/);
  // a divider separates the tip from the note
  expect(cause.closest('[data-cause-tip]')).toHaveClass('border-t');
});

it('the evidence lines are highlighted in the latest-failure hunk, as marked text', async () => {
  const panel = await openPanel('net');
  await within(panel).findByText('Likely cause: Network or external service');
  const hunk = panel.querySelector('[data-latest-failure]')!;
  const marks = [...hunk.querySelectorAll('mark')].map((m) => m.textContent);
  expect(marks.some((m) => m!.includes('net::ERR_CONNECTION_REFUSED'))).toBe(true);
  expect(hunk.querySelector('mark')!.className).toMatch(/underline/); // not colour alone
});

it('a failure with no rule (unknown) adds no tip and no highlight', async () => {
  const panel = await openPanel('plain');
  await waitFor(() => expect(panel.querySelector('[data-latest-failure]')).not.toBeNull());
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
  expect(within(panel).queryByText(/Likely cause/)).toBeNull();
  expect(panel.querySelector('[data-latest-failure] mark')).toBeNull();
  expect(within(panel).queryByRole('link', { name: /See the group/ })).toBeNull();
});

it('low confidence (few of the group matched a rule) adds no tip and no highlight', async () => {
  const panel = await openPanel('srv1');
  await waitFor(() => expect(panel.querySelector('[data-latest-failure]')).not.toBeNull());
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
  expect(within(panel).queryByText(/Likely cause/)).toBeNull();
  expect(panel.querySelector('[data-latest-failure] mark')).toBeNull();
});

it('the fake token never reaches the hunk, the highlight or the copied text', async () => {
  const panel = await openPanel('net');
  await within(panel).findByText('Likely cause: Network or external service');
  expect(panel.innerHTML).not.toContain('FAKE-TOKEN');
  expect(panel.textContent).toContain('[redacted]');
});
