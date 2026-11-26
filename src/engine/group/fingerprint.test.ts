import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { hashString } from '../hash';
import { fingerprint, TEMPLATE_CHARS } from './fingerprint';
import { normalizeMessage } from './normalize';

describe('fingerprint', () => {
  it('hashes the normalised text with hashString, keeps a capped template and the full normalised text', () => {
    const text = 'Timeout 5000ms exceeded waiting for 123e4567-e89b-42d3-a456-426614174000';
    const f = fingerprint(text);
    expect(f.normalized).toBe(normalizeMessage(text));
    expect(f.fingerprint).toBe(hashString(f.normalized));
    expect(f.fingerprint).toMatch(/^[0-9a-f]{14}$/);
    expect(f.template).toBe(f.normalized);
  });

  it('the template is cut at 300 characters; the full normalised text is still there', () => {
    expect(TEMPLATE_CHARS).toBe(300);
    const long = Array.from({ length: 200 }, (_, i) => `step${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + ((i * 7) % 26))}`).join(' ');
    const f = fingerprint(long);
    expect(f.normalized.length).toBeGreaterThan(300);
    expect(f.template).toHaveLength(300);
    expect(f.normalized.startsWith(f.template)).toBe(true);
  });

  it('numbers, timestamps and UUIDs do not change it; words do', () => {
    const a = fingerprint('Error: item 17 failed at 2026-11-27T10:00:00Z for 123e4567-e89b-42d3-a456-426614174000');
    const b = fingerprint('Error: item 99999 failed at 2027-01-01T01:02:03Z for 00000000-0000-4000-8000-000000000000');
    const c = fingerprint('Error: thing 17 failed at 2026-11-27T10:00:00Z for 123e4567-e89b-42d3-a456-426614174000');
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.fingerprint).not.toBe(c.fingerprint);
    fc.assert(
      fc.property(fc.nat(), fc.nat(), (x, y) => {
        expect(fingerprint(`retry ${x} of ${y} failed`).fingerprint).toBe(fingerprint(`retry ${y} of ${x} failed`).fingerprint);
      }),
      { numRuns: 200 },
    );
  });

  it('the fake lab token never appears in the template or the normalised text', () => {
    const f = fingerprint('GET http://127.0.0.1:47123/api/orders authorization: Bearer FAKE-TOKEN-NOT-A-SECRET-000000\nError: boom');
    for (const s of [f.template, f.normalized]) {
      expect(s).not.toContain('FAKE-TOKEN');
      expect(s).not.toContain('NOT-A-SECRET');
    }
  });
});
