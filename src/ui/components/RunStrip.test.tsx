import { it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RunSquare, RunStrip } from './RunStrip';
import type { RunCell } from '@/engine/view';

const OUTCOMES: RunCell['outcome'][] = ['pass', 'fail', 'retryPass', 'skip'];

it('every run square is a filled rounded square of the same size: no outline, no inner mark (DEV-47)', () => {
  for (const outcome of OUTCOMES) {
    const { container, unmount } = render(<RunSquare outcome={outcome} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox', '0 0 16 16');
    const rects = svg.querySelectorAll('rect');
    expect(rects, outcome).toHaveLength(1);
    const r = rects[0]!;
    expect([r.getAttribute('x'), r.getAttribute('y'), r.getAttribute('width'), r.getAttribute('height'), r.getAttribute('rx')], outcome).toEqual(['0.5', '0.5', '15', '15', '3']);
    expect(r.getAttribute('fill'), outcome).not.toBe('none');
    expect(r.hasAttribute('stroke'), outcome).toBe(false);
    expect(svg.querySelectorAll('path, line, circle, polyline').length, outcome).toBe(0);
    unmount();
  }
});

it('passed is green, failed red, passed on retry amber, skipped gray', () => {
  const fill = (o: RunCell['outcome']) => {
    const { container, unmount } = render(<RunSquare outcome={o} />);
    const f = container.querySelector('rect')!.getAttribute('fill');
    unmount();
    return f;
  };
  expect(fill('pass')).toBe('var(--status-stable)');
  expect(fill('fail')).toBe('var(--status-failing)');
  expect(fill('retryPass')).toBe('var(--status-flaky)');
  expect(fill('skip')).toBe('var(--status-skip)');
});

it('passed, failed, passed on retry and skipped each have a distinct name, so meaning does not rest on colour alone', () => {
  const titles = OUTCOMES.map((o) => {
    const { container, unmount } = render(<RunSquare outcome={o} />);
    const title = container.querySelector('title')!.textContent;
    unmount();
    return title;
  });
  expect(titles).toEqual(['Passed', 'Failed', 'Passed on retry', 'Skipped']);
  expect(new Set(titles).size).toBe(4);
  const cells = OUTCOMES.map((outcome, i) => ({ run: { runId: `r${i}` }, outcome }) as unknown as RunCell);
  const { container } = render(<RunStrip cells={cells} />);
  expect(container.querySelector('[role=img]')).toHaveAccessibleName('Last 4 runs, oldest first: Passed, Failed, Passed on retry, Skipped');
});
