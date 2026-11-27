import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogViewer } from './LogViewer';
import { EvidenceChip } from './EvidenceChip';
import type { QuotedLine } from '../data/log';

const FAKE = 'FAKE-TOKEN-NOT-A-SECRET-000000';
const lines = (n: number, f: (i: number) => string = (i) => `line ${i + 1} of the log`) => Array.from({ length: n }, (_, i) => f(i)).join('\n');
const rows = (c: HTMLElement) => c.querySelectorAll('[data-line]');
const region = () => screen.getByRole('region', { name: 'Log for checkout › coupon, Run nightly-18.json, attempt 1' });
const view = (raw: string, extra: Partial<Parameters<typeof LogViewer>[0]> = {}) =>
  render(<LogViewer raw={raw} test="checkout › coupon" run="Run nightly-18.json, attempt 1" evidence={[]} {...extra} />);

const writeText = vi.fn(async () => {});
beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});
afterEach(() => vi.restoreAllMocks());

it('draws numbered lines in a named region with a footer that says which lines show', () => {
  const { container } = view(lines(12));
  expect(region()).toBeInTheDocument();
  expect(rows(container)).toHaveLength(12);
  expect(container.querySelector('[data-line="3"]')).toHaveTextContent('line 3 of the log');
  expect(screen.getByText('Lines 1 to 12 of 12')).toBeInTheDocument();
  // line numbers are not text a person selects, and are hidden from a screen reader (the line text is read)
  expect(container.querySelector('[data-line="3"] [data-gutter]')).toHaveAttribute('aria-hidden', 'true');
  expect(container.querySelector('[data-line="3"] [data-gutter]')!.className).toMatch(/select-none/);
});

it('a 5 MB log draws at most 150 rows, and scrolling moves the window', () => {
  const raw = lines(61_204, (i) => `${i + 1} GET /api/orders/12345 failed with status 503 after 30000ms retry=2 host=db-7.internal`);
  expect(raw.length).toBeGreaterThan(5_000_000);
  const t0 = performance.now();
  const { container } = view(raw);
  const first = rows(container).length;
  expect(first).toBeGreaterThan(0);
  expect(first).toBeLessThanOrEqual(150);
  expect(screen.getByText(/^Lines 1 to \d+ of 61,204$/)).toBeInTheDocument();
  const r = region();
  r.scrollTop = 20 * 30_000;
  fireEvent.scroll(r);
  expect(rows(container).length).toBeLessThanOrEqual(150);
  expect(container.querySelector('[data-line="30001"]')).not.toBeNull();
  expect(container.querySelector('[data-line="1"]')).toBeNull();
  expect(performance.now() - t0).toBeLessThan(3000);
});

it('hostile text is drawn as text', () => {
  const { container } = view('<img src=x onerror=alert(1)>\n<script>alert(2)</script>\n"><svg onload=alert(3)>');
  expect(region().querySelector('img, script, svg')).toBeNull();
  expect(container.querySelector('[data-line="1"]')!.textContent).toContain('<img src=x onerror=alert(1)>');
});

it('a secret is masked in the rows, and copy line puts the masked line on the clipboard', async () => {
  const raw = `first\nAuthorization: Bearer ${FAKE}\nlast`;
  const { container } = view(raw);
  expect(container.innerHTML).not.toContain('FAKE-TOKEN');
  expect(container.querySelector('[data-line="2"]')).toHaveTextContent('[redacted]');
  await userEvent.click(container.querySelector('[data-line="2"]')!);
  await userEvent.click(screen.getByRole('button', { name: 'Copy line' }));
  expect(writeText).toHaveBeenCalledTimes(1);
  const copied = (writeText.mock.calls[0] as unknown as [string])[0];
  expect(copied).toContain('Authorization: Bearer [redacted]');
  expect(copied).not.toContain('FAKE-TOKEN');
});

it('searching the log gives a live count, steps through the matches, and says No matches', async () => {
  const user = userEvent.setup();
  const { container } = view(lines(300, (i) => (i % 100 === 49 ? `Timeout number ${i}` : `ok ${i}`)));
  const box = screen.getByRole('searchbox', { name: 'Search the log' });
  await user.type(box, 'timeout');
  const status = screen.getByRole('status');
  expect(status).toHaveTextContent('1 of 3');
  await user.click(screen.getByRole('button', { name: 'Next match' }));
  expect(status).toHaveTextContent('2 of 3');
  await user.click(screen.getByRole('button', { name: 'Previous match' }));
  await user.click(screen.getByRole('button', { name: 'Previous match' }));
  expect(status).toHaveTextContent('3 of 3'); // wraps round
  expect(container.querySelector('[data-line="250"] mark')).not.toBeNull(); // the current match is drawn and marked
  await user.clear(box);
  await user.type(box, 'zzzz');
  expect(status).toHaveTextContent('No matches');
  await user.type(box, '{Escape}');
  expect(box).toHaveValue('');
});

it('Enter in the search field goes to the next match, Shift+Enter to the previous', async () => {
  const user = userEvent.setup();
  view(lines(50, (i) => (i % 10 === 0 ? 'hit' : 'miss')));
  const box = screen.getByRole('searchbox', { name: 'Search the log' });
  await user.type(box, 'hit');
  expect(screen.getByRole('status')).toHaveTextContent('1 of 5');
  await user.type(box, '{Enter}');
  expect(screen.getByRole('status')).toHaveTextContent('2 of 5');
  await user.type(box, '{Shift>}{Enter}{/Shift}');
  expect(screen.getByRole('status')).toHaveTextContent('1 of 5');
});

it('Wrap lines is a switch', async () => {
  view(lines(5));
  const wrap = screen.getByRole('switch', { name: 'Wrap lines' });
  const before = wrap.getAttribute('aria-checked');
  await userEvent.click(wrap);
  expect(wrap.getAttribute('aria-checked')).not.toBe(before);
});

it('a line over 2,000 characters is cut with Show more, and Show less puts it back', async () => {
  const user = userEvent.setup();
  const { container } = view(`short\n${'y'.repeat(2000 + 4812)}`);
  const row = container.querySelector('[data-line="2"]')!;
  expect(row.textContent).toContain('y'.repeat(100));
  expect(row.textContent!.length).toBeLessThan(2300);
  await user.click(within(row as HTMLElement).getByRole('button', { name: 'Show more (4,812 more characters)' }));
  expect(container.querySelector('[data-line="2"]')!.textContent).toContain('y'.repeat(6000));
  await user.click(within(container.querySelector('[data-line="2"]') as HTMLElement).getByRole('button', { name: 'Show less' }));
  expect(container.querySelector('[data-line="2"]')!.textContent!.length).toBeLessThan(2300);
});

const ev = (line: number, text: string, found = true): QuotedLine => ({ line, text, found });

it('evidence lines carry an accent bar and the quoted words are marked with a dotted underline; an unverified quote is not highlighted', () => {
  const { container } = view('a\nTimeout 30000ms exceeded while waiting\nb\nnot the quoted text', {
    evidence: [ev(2, 'Timeout 30000ms exceeded'), ev(4, 'ECONNRESET', false)],
  });
  const hit = container.querySelector('[data-line="2"]')!;
  expect(hit).toHaveAttribute('data-evidence');
  expect(hit.className).toMatch(/border-l-\[3px\]/);
  const mark = hit.querySelector('mark')!;
  expect(mark.textContent).toBe('Timeout 30000ms exceeded');
  expect(mark.className).toMatch(/underline/);
  expect(container.querySelector('[data-line="4"]')).not.toHaveAttribute('data-evidence');
});

it('a jump goes to the line, scrolls it into the window and puts focus on it', () => {
  const raw = lines(5000);
  const { container, rerender } = view(raw, { evidence: [ev(3000, 'line 3000 of the log')] });
  rerender(<LogViewer raw={raw} test="checkout › coupon" run="Run nightly-18.json, attempt 1" evidence={[ev(3000, 'line 3000 of the log')]} jump={{ line: 3000, tick: 1 }} />);
  const row = container.querySelector('[data-line="3000"]') as HTMLElement;
  expect(row).not.toBeNull();
  expect(document.activeElement).toBe(row);
  expect(row.className).toMatch(/ring-2/); // the jump target has a focus ring
  expect(rows(container).length).toBeLessThanOrEqual(150);
});

it('opens at the first evidence line when there is one', () => {
  const raw = lines(5000);
  const { container } = view(raw, { evidence: [ev(2500, 'line 2500 of the log')] });
  expect(container.querySelector('[data-line="2500"]')).not.toBeNull();
  expect(container.querySelector('[data-line="1"]')).toBeNull();
});

it('Home and End jump to the ends of the log', () => {
  const { container } = view(lines(5000));
  const r = region();
  fireEvent.keyDown(r, { key: 'End' });
  expect(container.querySelector('[data-line="5000"]')).not.toBeNull();
  fireEvent.keyDown(r, { key: 'Home' });
  expect(container.querySelector('[data-line="1"]')).not.toBeNull();
});

it('an empty log draws one empty line without breaking', () => {
  const { container } = view('');
  expect(rows(container)).toHaveLength(1);
});

// ---- evidence chip ----
it('a verified chip is a button that quotes the line, jumps to it, and says where it came from', async () => {
  const onJump = vi.fn();
  render(<EvidenceChip quote={ev(42, 'Timeout 30000ms exceeded while waiting for locator')} onJump={onJump} />);
  const chip = screen.getByRole('button', { name: /Timeout 30000ms exceeded while waiting for locator/ });
  expect(chip).toHaveTextContent('Quoted from the log · line 42');
  await userEvent.click(chip);
  expect(onJump).toHaveBeenCalledWith(42);
});

it('an unverified chip is a hint only: amber, not a button, not a jump', () => {
  const { container } = render(<EvidenceChip quote={ev(118, 'ECONNRESET while calling payments-api', false)} onJump={() => {}} />);
  expect(screen.queryByRole('button')).toBeNull();
  expect(container).toHaveTextContent('Not found in the log · line 118');
  expect(container).toHaveTextContent('ECONNRESET while calling payments-api');
  expect(container.firstElementChild!.className).toMatch(/border-status-flaky/);
});

it('a chip shows the masked quote only', () => {
  const { container } = render(<EvidenceChip quote={ev(2, 'token=[redacted] failed')} onJump={() => {}} />);
  expect(container.innerHTML).not.toContain('FAKE-TOKEN');
});
