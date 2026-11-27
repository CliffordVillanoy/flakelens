import { it, expect, beforeEach, beforeAll, afterAll, describe } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rankTests } from '@/engine/score/rank';
import { scoreTests } from '@/engine/score/score';
import type { Dataset } from '@/engine/types';
import { useStore } from '../data/store';
import { buildGroups, type Fail } from '../data/groupsFixture';
import { Groups } from './Groups';

// jsdom has no layout; give the virtual list a viewport (TanStack reads client* for the scroller, offset* for items).
const PROPS = { clientHeight: 900, clientWidth: 1200, offsetHeight: 160, offsetWidth: 1200 } as const;
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

const REFUSED = (n: number) => `page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:${40000 + n}/api/x${n}`;
const ENV = (n: number) => `Error: apiRequestContext.get: socket hang up (ECONNRESET)\nCall log: ${n}`;
const PLAIN = (n: number) => `Error: expect(received).toBe(expected) // Object.is equality\n\nExpected: ${n}\nReceived: ${n + 1}`;
const FAKE = 'FAKE-TOKEN-NOT-A-SECRET-000000';

const fixture = (): Dataset =>
  buildGroups([
    ...Array.from({ length: 6 }, (_, i): Fail => ({ run: 5, test: `e${i}`, message: ENV(i) })),
    ...Array.from({ length: 5 }, (_, i): Fail => ({ run: 1 + (i % 3), test: `n${i}`, message: REFUSED(i) })),
    ...Array.from({ length: 2 }, (_, i): Fail => ({ run: 7, test: `p${i}`, message: PLAIN(i) })),
    { run: 2, test: 'solo', message: "Error: locator.click: Error: strict mode violation: getByRole('button') resolved to 2 elements" },
  ]);

const cards = () => screen.getAllByRole('listitem');
const headings = () => cards().map((c) => c.textContent ?? '');

beforeEach(() => {
  window.location.hash = '#/groups';
  load(fixture());
});

describe('the screen and its tabs', () => {
  it('is the second tab beside Tests, with the group count, and a heading', async () => {
    render(<Groups />);
    expect(screen.getByRole('heading', { level: 1, name: 'Failure groups' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Views' });
    const tests = within(nav).getByRole('link', { name: /^Tests/ });
    const groups = within(nav).getByRole('link', { name: /^Groups/ });
    expect(tests).toHaveAttribute('href', '#/tests');
    expect(groups).toHaveAttribute('aria-current', 'page');
    expect(groups).toHaveTextContent('4'); // 4 groups
    expect(tests).not.toHaveAttribute('aria-current');
  });

  it('lists the environment event first, as one card with its heading, then the groups by failures', async () => {
    render(<Groups />);
    const list = await screen.findByRole('list', { name: 'Failure groups' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
    const first = within(list).getAllByRole('listitem')[0]!;
    expect(within(first).getByRole('heading', { name: '6 tests failed the same way in run run-5.json' })).toBeInTheDocument();
    expect(first).toHaveTextContent('socket hang up (ECONNRESET)');
    // the other groups: 5 failures, 2, 1
    expect(headings().slice(1).map((h) => /(\d+) failures?/.exec(h)?.[1])).toEqual(['5', '2', '1']);
  });
});

describe('a card', () => {
  it('shows the masked template with grey tags, the counts, last seen, the chip and the evidence', async () => {
    render(<Groups />);
    const card = (await screen.findAllByRole('listitem')).find((c) => c.textContent?.includes('ERR_CONNECTION_REFUSED'))!;
    // template in mono, masked values as tags
    expect(card.querySelector('[data-template]')).toHaveTextContent('page.goto: net::ERR_CONNECTION_REFUSED at ‹path›');
    expect([...card.querySelectorAll('[data-tag]')].map((t) => t.textContent)).toEqual(['‹path›']);
    expect(card).toHaveTextContent('5 failures · 5 tests · last seen 13 Nov');
    // outlined chip: the cause, then the confidence in words
    const chip = card.querySelector('[data-chip]')!;
    expect(chip).toHaveTextContent('Likely cause: Network or external service');
    expect(chip).toHaveTextContent('High confidence');
    expect(chip.className).not.toMatch(/\bbg-(primary|status)/); // outlined, never filled
    // evidence: a quoted log line with its line number, the label only for screen readers
    const ev = card.querySelector('[data-evidence]')!;
    expect(ev).toHaveTextContent('1');
    expect(ev).toHaveTextContent('page.goto: net::ERR_CONNECTION_REFUSED');
    expect(within(card).getByText('Evidence from the logs')).toHaveClass('sr-only');
    // tests link to their panel
    const links = within(card).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toContain('#/tests/n0');
    expect(links[0]).toHaveTextContent('checkout › n0');
  });

  it('an unknown cause says so, has no evidence block and no tip', async () => {
    render(<Groups />);
    const card = (await screen.findAllByRole('listitem')).find((c) => c.textContent?.includes('Object.is equality'))!;
    expect(card.querySelector('[data-chip]')).toHaveTextContent('Cause unknown');
    expect(card.querySelector('[data-chip]')).not.toHaveTextContent('confidence');
    expect(card.querySelector('[data-evidence]')).toBeNull();
    expect(card).not.toHaveTextContent('probably');
  });

  it('five tests show three links; Show all N tests expands in place and keeps focus on the button', async () => {
    const user = userEvent.setup();
    render(<Groups />);
    const card = (await screen.findAllByRole('listitem')).find((c) => c.textContent?.includes('ERR_CONNECTION_REFUSED'))!;
    expect(within(card).getAllByRole('link')).toHaveLength(3);
    const more = within(card).getByRole('button', { name: 'Show all 5 tests' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await user.click(more);
    expect(within(card).getAllByRole('link')).toHaveLength(5);
    const less = within(card).getByRole('button', { name: 'Show fewer tests' });
    expect(less).toHaveAttribute('aria-expanded', 'true');
    expect(less).toHaveFocus();
  });

  it('a group of 3 tests or fewer has no Show all button; one test says "test"', async () => {
    render(<Groups />);
    const card = (await screen.findAllByRole('listitem')).find((c) => c.textContent?.includes('strict mode violation'))!;
    expect(within(card).queryByRole('button', { name: /Show/ })).toBeNull();
    expect(card).toHaveTextContent('1 failure · 1 test ·');
  });

  it('the evidence shows two lines and Show all reveals the rest', async () => {
    const message = ['Test timeout of 30000ms exceeded.', 'TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.', "  - waiting for locator('#pay')", 'await page.waitForTimeout(200)'].join('\n');
    load(buildGroups([{ run: 1, test: 't', message }]));
    const user = userEvent.setup();
    render(<Groups />);
    const card = (await screen.findAllByRole('listitem'))[0]!;
    const lines = () => card.querySelectorAll('[data-evidence-line]').length;
    expect(lines()).toBe(2);
    await user.click(within(card).getByRole('button', { name: /^Show all \d+ lines$/ }));
    expect(lines()).toBeGreaterThan(2);
    await user.click(within(card).getByRole('button', { name: 'Show fewer lines' }));
    expect(lines()).toBe(2);
  });
});

describe('search and sort live in the URL', () => {
  it('search filters by the template text and the tab count follows it', async () => {
    const user = userEvent.setup();
    render(<Groups />);
    const box = await screen.findByRole('searchbox', { name: 'Search failure text' });
    await user.type(box, 'econnreset');
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(window.location.hash).toBe('#/groups?q=econnreset');
    expect(within(screen.getByRole('navigation', { name: 'Views' })).getByRole('link', { name: /^Groups/ })).toHaveTextContent('1');
  });

  it('opens with the search from the URL', async () => {
    window.location.hash = '#/groups?q=ERR_CONNECTION';
    render(<Groups />);
    expect(await screen.findByRole('searchbox', { name: 'Search failure text' })).toHaveValue('ERR_CONNECTION');
    expect(cards()).toHaveLength(1);
  });

  it('sort: Most failures, Most tests, Latest; the choice goes into the URL; environment events stay first', async () => {
    const user = userEvent.setup();
    render(<Groups />);
    const sort = await screen.findByRole('combobox', { name: 'Sort groups' });
    expect([...sort.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Most failures', 'Most tests', 'Latest']);
    await user.selectOptions(sort, 'Latest');
    expect(window.location.hash).toBe('#/groups?sort=latest');
    await waitFor(() => expect(headings().slice(1).map((h) => /(\d+) failures?/.exec(h)?.[1])).toEqual(['2', '5', '1'])); // last seen: run 7, run 3, run 2
    expect(headings()[0]).toContain('6 tests failed the same way');
  });

  it('search and sort travel together', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/groups?sort=tests';
    render(<Groups />);
    await user.type(await screen.findByRole('searchbox', { name: 'Search failure text' }), 'Object');
    await waitFor(() => expect(window.location.hash).toBe('#/groups?q=Object&sort=tests'));
  });
});

describe('edge states', () => {
  it('no failures at all', async () => {
    load(buildGroups([]));
    render(<Groups />);
    expect(await screen.findByText('No failures to group')).toBeInTheDocument();
    expect(screen.getByText('Every test passed in the loaded runs. Groups appear when a test fails.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Failure groups' })).toBeNull();
  });

  it('no match for the search, with Clear search', async () => {
    window.location.hash = '#/groups?q=zzz';
    const user = userEvent.setup();
    render(<Groups />);
    expect(await screen.findByText('No groups match "zzz"')).toBeInTheDocument();
    expect(screen.getByText('Try a shorter word from the error message.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(window.location.hash).toBe('#/groups');
    await waitFor(() => expect(cards()).toHaveLength(4));
  });

  it('a very long hostile message renders as text, is cut at 300 characters, and Show full message reveals the rest', async () => {
    const hostile = `Error: expected <script>alert(1)</script> <img src=x onerror=alert(2)> ${'abcdefg '.repeat(120)}END`;
    load(buildGroups([{ run: 1, test: 't', message: hostile }]));
    const user = userEvent.setup();
    const { container } = render(<Groups />);
    const card = (await screen.findAllByRole('listitem'))[0]!;
    const template = card.querySelector('[data-template]')!;
    expect(template.textContent!.length).toBeLessThanOrEqual(310);
    expect(template.textContent).toContain('<script>alert('); // as text, numbers masked
    expect(template.textContent).toContain('</script>');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(template.textContent).not.toContain('END');
    const show = within(card).getByRole('button', { name: 'Show full message' });
    expect(show).toHaveAttribute('title', 'Long messages are cut at 300 characters. The full text stays one click away.');
    await user.click(show);
    expect(card.querySelector('[data-template]')!.textContent).toContain('END');
    expect(container.querySelector('script')).toBeNull();
  });
});

describe('secrets never reach the screen (DEV-38 criterion 9)', () => {
  it('an evidence line holding a token is shown redacted', async () => {
    const message = `Error: connect ECONNREFUSED 127.0.0.1:5432 authorization: Bearer ${FAKE}\nsecond line token=${FAKE}`;
    load(buildGroups([{ run: 1, test: 't', message }]));
    const { container } = render(<Groups />);
    const card = (await screen.findAllByRole('listitem'))[0]!;
    expect(card.querySelector('[data-evidence]')).toHaveTextContent('[redacted]');
    expect(container.textContent).not.toContain('FAKE-TOKEN');
    expect(container.innerHTML).not.toContain('FAKE-TOKEN');
    expect(container.innerHTML).not.toContain(FAKE);
    // the full message, too
    const user = userEvent.setup();
    const long = `${message} ${'x '.repeat(200)}`;
    load(buildGroups([{ run: 1, test: 't', message: long }]));
    render(<Groups />);
    const btn = (await screen.findAllByRole('button', { name: 'Show full message' }))[0]!;
    await user.click(btn);
    expect(document.body.innerHTML).not.toContain('FAKE-TOKEN');
  });
});

describe('a link from the panel', () => {
  it('?g=<fingerprint> scrolls to that card and puts focus on it', async () => {
    const ds = fixture();
    load(ds);
    const { groupsView } = await import('../data/groups');
    const target = groupsView(ds).cards.find((c) => c.group.testIds.includes('solo'))!.group.fingerprint;
    window.location.hash = `#/groups?g=${target}`;
    render(<Groups />);
    await waitFor(() => expect(document.activeElement?.getAttribute('data-group')).toBe(target));
  });
});

describe('5,000 groups stay responsive', () => {
  it('draws only the cards on screen, shows the full count, and renders fast', async () => {
    const fails: Fail[] = Array.from({ length: 5000 }, (_, i) => ({
      run: i % 8,
      test: `t${i}`,
      message: `unique${i.toString(36)} word${(i * 7).toString(36)} text${(i * 13).toString(36)} about${(i * 17).toString(36)} step${(i * 19).toString(36)} thing${(i * 23).toString(36)}`,
    }));
    const ds = buildGroups(fails);
    load(ds);
    const t0 = performance.now();
    render(<Groups />);
    await screen.findByRole('list', { name: 'Failure groups' });
    const ms = performance.now() - t0;
    console.log(`Groups: 5,000 groups first render ${Math.round(ms)} ms, ${cards().length} cards in the DOM`);
    expect(cards().length).toBeLessThan(60);
    expect(within(screen.getByRole('navigation', { name: 'Views' })).getByRole('link', { name: /^Groups/ })).toHaveTextContent(/\d/);
    expect(ms).toBeLessThan(3000);
    await act(async () => {});
  });
});
