import { it, expect } from 'vitest';
import { hashString } from './hash';

it('is stable and hex', () => {
  expect(hashString('a')).toBe(hashString('a'));
  expect(hashString('a')).toMatch(/^[0-9a-f]{14}$/);
});
it('differs for different input', () => expect(hashString('a')).not.toBe(hashString('b')));
it('handles empty and unicode', () => {
  expect(hashString('')).toMatch(/^[0-9a-f]{14}$/);
  expect(hashString('テスト')).not.toBe(hashString('テスト '));
});
