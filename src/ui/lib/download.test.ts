import { it, expect, vi, afterEach } from 'vitest';
import { downloadFile } from './download';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('revokes the object URL after a short delay, not right after the click (Safari cancels the download otherwise)', () => {
  vi.useFakeTimers();
  const create = vi.fn(() => 'blob:test');
  const revoke = vi.fn();
  window.URL.createObjectURL = create;
  window.URL.revokeObjectURL = revoke;
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  downloadFile('a.csv', 'text/csv', 'x');
  expect(click).toHaveBeenCalledTimes(1);
  expect(revoke).not.toHaveBeenCalled();
  vi.advanceTimersByTime(500);
  expect(revoke).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1000);
  expect(revoke).toHaveBeenCalledWith('blob:test');
});
