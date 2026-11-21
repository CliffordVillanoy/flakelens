import { it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ImportRecord } from '@/engine/types';
import { ImportProgress } from './ImportProgress';
import { ImportBanner } from './ImportBanner';

afterEach(() => vi.useRealTimers());

it('shows per-file progress and Cancel only after 1 s', () => {
  vi.useFakeTimers();
  const onCancel = vi.fn();
  render(<ImportProgress files={['a.json', 'b.json', 'c.json']} done={1} onCancel={onCancel} />);
  expect(screen.getByText('Reading 3 files…')).toBeInTheDocument();
  const rows = screen.getAllByRole('listitem');
  expect(rows[0]).toHaveTextContent('a.jsonDone');
  expect(rows[2]).toHaveTextContent('c.jsonWaiting');
  expect(screen.queryByRole('button', { name: 'Cancel import' })).toBeNull();
  act(() => vi.advanceTimersByTime(1000));
  screen.getByRole('button', { name: 'Cancel import' }).click();
  expect(onCancel).toHaveBeenCalled();
});

const record = (over: Partial<ImportRecord> = {}): ImportRecord => ({
  importId: 'i',
  fileName: 'f.json',
  importedAt: 'x',
  result: 'success',
  counts: { found: 4, imported: 4, notImported: 0 },
  notices: [],
  runIds: ['r'],
  ...over,
});

it('adding to existing data says what was added and links the new Flaky tests', async () => {
  const onDismiss = vi.fn();
  render(
    <ImportBanner
      summary={{ records: [record(), record()], newFlaky: 2, newRuns: 3, wasEmpty: false }}
      totals={{ tests: 211, runs: 12 }}
      onDismiss={onDismiss}
    />,
  );
  const b = screen.getByRole('status');
  expect(b).toHaveTextContent('Added 3 runs. Now 211 tests from 12 runs.');
  expect(screen.getByRole('link', { name: 'Show the 2 new Flaky tests' })).toHaveAttribute('href', '#/tests?status=flaky');
  await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(onDismiss).toHaveBeenCalled();
});

it('no rank-change link when nothing turned Flaky, and nothing at all when every file failed', () => {
  const { rerender, container } = render(
    <ImportBanner summary={{ records: [record()], newFlaky: 0, newRuns: 1, wasEmpty: false }} totals={{ tests: 3, runs: 2 }} onDismiss={() => {}} />,
  );
  expect(screen.queryByRole('link', { name: /new Flaky/ })).toBeNull();
  rerender(
    <ImportBanner
      summary={{ records: [record({ result: 'failed', runIds: [] })], newFlaky: 0, newRuns: 0, wasEmpty: true }}
      totals={{ tests: 0, runs: 0 }}
      onDismiss={() => {}}
    />,
  );
  expect(container).toBeEmptyDOMElement();
});
