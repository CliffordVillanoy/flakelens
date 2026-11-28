import { it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { CorrelationResult, ValueRow } from '@/engine/correlate/correlate';
import { corrBoxes } from '../data/full';
import { Correlations } from './Correlations';

const val = (value: string, failed: number, attempts: number): ValueRow => ({ value, failed, attempts, rate: failed / attempts });
const base = (dimension: CorrelationResult['dimension'], over: Partial<CorrelationResult> = {}): CorrelationResult => ({
  dimension, status: 'missing', values: [], others: { failed: 0, attempts: 0, rate: 0 }, pointsHigher: 0, oddsRatio: 1, adjustedP: 1, comparisons: 2, ...over,
});
const finding = (dimension: CorrelationResult['dimension'], p: number, strength: 'Strong' | 'Moderate' = 'Strong') =>
  base(dimension, {
    status: 'finding', strength, highlightedValue: 'webkit', adjustedP: p, pointsHigher: 70, oddsRatio: 42,
    values: [val('chromium', 2, 12), val('webkit', 7, 8)], others: { failed: 2, attempts: 12, rate: 2 / 12 },
  });

const draw = (rs: CorrelationResult[]) => render(<Correlations boxes={corrBoxes(rs)} />);

it('the strongest finding is open with its sentence, strength word and bars; the how block is closed', () => {
  const { container } = draw([finding('browser', 0.003), base('shard'), base('os'), base('hour')]);
  const box = container.querySelector('[data-corr=browser]')!;
  expect(box.tagName).toBe('DIV');
  expect(within(box as HTMLElement).getByText('Strong')).toBeInTheDocument();
  expect(box).toHaveTextContent('Fails more on webkit: 7 of 8 attempts, against 2 of 12 elsewhere. A clue, not proof.');
  expect(box).toHaveTextContent('7 of 8 · 88%');
  const how = within(box as HTMLElement).getByText('How this was worked out').closest('details')!;
  expect(how.open).toBe(false);
  expect(how).toHaveTextContent("Fisher's exact test");
});

it('a second finding is closed behind its dimension name and strength', () => {
  const { container } = draw([finding('browser', 0.001), finding('os', 0.04, 'Moderate')]);
  const second = container.querySelector('[data-corr=os]') as HTMLDetailsElement;
  expect(second.tagName).toBe('DETAILS');
  expect(second.open).toBe(false);
  expect(within(second).getByText('Moderate')).toBeInTheDocument();
});

it('the highlighted bar is the only red one, and a bar never depends on colour alone (counts are text)', () => {
  const { container } = draw([finding('browser', 0.003)]);
  expect(container.querySelectorAll('.bg-status-failing')).toHaveLength(1);
  expect(container).toHaveTextContent('2 of 12 · 17%');
});

it('quiet boxes: no clear link, not enough data (a calm edge) and missing data; no strength word, no bars', () => {
  const { container } = draw([
    base('os', { status: 'none', values: [val('Linux', 6, 20), val('Windows', 3, 8)] }),
    base('shard', { status: 'notEnough', reason: { minAttempts: 10, minFails: 3, minGroup: 3, attempts: 9, fails: 2, smallestGroup: 4 } }),
    base('hour'),
  ]);
  expect(container).toHaveTextContent('No clear link (Linux: 6 of 20, Windows: 3 of 8).');
  expect(container).toHaveTextContent('Not enough data yet. Needs 10 attempts and 3 failures; you have 9 and 2.');
  expect(container).toHaveTextContent('No start times in your files.');
  expect(screen.queryByText(/Strong|Moderate|Weak/)).toBeNull();
  expect(container.querySelectorAll('li')).toHaveLength(0);
  expect(container.querySelector('[data-corr=shard]')!.className).toMatch(/border-l-\[3px\]/);
});

it('hostile values are drawn as text', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const r = finding('browser', 0.001);
  r.highlightedValue = evil;
  r.values = [val('chromium', 0, 10), val(evil, 9, 10)];
  const { container } = draw([r]);
  expect(container.querySelector('img')).toBeNull();
  expect(container).toHaveTextContent('<img src=x onerror=alert(1)>');
});
