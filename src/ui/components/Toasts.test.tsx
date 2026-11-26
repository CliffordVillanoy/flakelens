import { it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toasts, toast, toastError, toastUndo } from './Toasts';

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

// ---- undo toast (DEV-33): 10 seconds, a timer bar, pauses on hover and focus ----
const undoToast = () => screen.queryByText('undo-file removed.');

it('an undo toast has Undo and Dismiss, a timer bar, and closes after 10 seconds', () => {
  vi.useFakeTimers();
  render(<Toasts />);
  const onUndo = vi.fn();
  act(() => toastUndo('undo-file removed.', onUndo));
  const box = undoToast()!.closest('[role=status]') as HTMLElement;
  expect(box).not.toBeNull();
  expect(within(box).getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  expect(within(box).getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  expect(box.querySelector('[data-timer]')).not.toBeNull();
  act(() => void vi.advanceTimersByTime(9_000));
  expect(undoToast()).not.toBeNull();
  act(() => void vi.advanceTimersByTime(1_200));
  act(() => void vi.advanceTimersByTime(300)); // the fade
  expect(undoToast()).toBeNull();
  expect(onUndo).not.toHaveBeenCalled();
});

it('the timer pauses while the toast is hovered and while it has focus', () => {
  vi.useFakeTimers();
  render(<Toasts />);
  act(() => toastUndo('undo-file removed.', () => {}));
  const toastEl = undoToast()!.closest('[data-toast]') as HTMLElement;
  act(() => void vi.advanceTimersByTime(6_000));
  fireEvent.mouseEnter(toastEl);
  act(() => void vi.advanceTimersByTime(30_000));
  expect(undoToast()).not.toBeNull(); // held
  fireEvent.mouseLeave(toastEl);
  act(() => void vi.advanceTimersByTime(3_000));
  expect(undoToast()).not.toBeNull(); // 6 + 3 = 9 s used
  fireEvent.focus(screen.getByRole('button', { name: 'Undo' }));
  act(() => void vi.advanceTimersByTime(30_000));
  expect(undoToast()).not.toBeNull(); // held by focus
  fireEvent.blur(screen.getByRole('button', { name: 'Undo' }));
  act(() => void vi.advanceTimersByTime(1_500));
  act(() => void vi.advanceTimersByTime(300));
  expect(undoToast()).toBeNull();
});

it('Undo runs the action once and closes the toast; Esc closes it without undoing', async () => {
  const onUndo = vi.fn();
  render(<Toasts />);
  act(() => toastUndo('undo-file removed.', onUndo));
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(onUndo).toHaveBeenCalledTimes(1);
  await vi.waitFor(() => expect(undoToast()).toBeNull());
  act(() => toastUndo('undo-file removed.', onUndo));
  act(() => screen.getByRole('button', { name: 'Undo' }).focus());
  await userEvent.keyboard('{Escape}');
  await vi.waitFor(() => expect(undoToast()).toBeNull());
  expect(onUndo).toHaveBeenCalledTimes(1);
});
