import { it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toasts, toast, toastError } from './Toasts';

afterEach(() => {
  vi.useRealTimers();
});

const names = () => screen.getAllByText(/^toast /).map((e) => e.textContent);

it('shows at most 2 toasts at a time, newest at the bottom', () => {
  render(<Toasts />);
  act(() => {
    toast('toast one');
    toast('toast two');
    toast('toast three');
  });
  expect(names()).toEqual(['toast two', 'toast three']);
});

it('sits bottom left on desktop and full width on phones, in a status region', () => {
  render(<Toasts />);
  act(() => toast('toast pos'));
  const box = screen.getByText('toast pos').closest('[data-toasts]') as HTMLElement;
  expect(box).toHaveClass('left-4', 'bottom-4', 'max-sm:inset-x-4');
  expect(box.className).not.toMatch(/\bright-4\b/);
  expect(screen.getByText('toast pos').closest('[role="status"]')).not.toBeNull();
});

it('never takes focus when it appears', () => {
  render(<Toasts />);
  const before = document.activeElement;
  act(() => toast('toast focus'));
  expect(document.activeElement).toBe(before);
});

it('Esc closes the focused toast and only that one', async () => {
  render(<Toasts />);
  act(() => {
    toast('toast keep');
    toast('toast close');
  });
  const closeBtn = screen.getAllByRole('button', { name: 'Dismiss' })[1]!;
  closeBtn.focus();
  await userEvent.keyboard('{Escape}');
  await vi.waitFor(() => expect(screen.queryByText('toast close')).toBeNull());
  expect(screen.getByText('toast keep')).toBeInTheDocument();
});

it('fades in 150 ms, only when motion is allowed', () => {
  render(<Toasts />);
  act(() => toast('toast fade'));
  const el = screen.getByText('toast fade').closest('[data-toast]') as HTMLElement;
  expect(el.className).toContain('motion-safe:animate-[toast-in_150ms_ease-out]');
});

it('an error toast is a role alert, stays until dismissed, and closes without waiting when motion is reduced', async () => {
  vi.useFakeTimers();
  render(<Toasts />);
  act(() => toastError('toast bad'));
  act(() => vi.advanceTimersByTime(60_000));
  expect(screen.getByRole('alert')).toHaveTextContent('toast bad');
});

it('an info toast closes by itself after 5 s', () => {
  vi.useFakeTimers();
  render(<Toasts />);
  act(() => toast('toast soon'));
  act(() => vi.advanceTimersByTime(5000 + 200));
  expect(screen.queryByText('toast soon')).toBeNull();
});
