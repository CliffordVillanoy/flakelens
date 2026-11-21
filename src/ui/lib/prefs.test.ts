import { it, expect, vi, afterEach } from 'vitest';
import { getPref, setPref } from './prefs';

afterEach(() => vi.restoreAllMocks());

it('round-trips a value', () => {
  setPref('theme', 'light');
  expect(getPref('theme', 'dark')).toBe('light');
  expect(getPref('missing', 7)).toBe(7);
});

it('falls back when stored JSON is corrupt', () => {
  window.localStorage.setItem('flakelens.x', '{not json');
  expect(getPref('x', 1)).toBe(1);
});

it('never throws when localStorage throws', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('SecurityError');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError');
  });
  expect(getPref('x', 1)).toBe(1);
  expect(() => setPref('x', 2)).not.toThrow();
});

it('never throws when localStorage itself is unavailable', () => {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(getPref('x', 1)).toBe(1);
  expect(() => setPref('x', 2)).not.toThrow();
});
