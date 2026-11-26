import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { MAX_INPUT_CHARS, MAX_NORMALISED_CHARS, PLACEHOLDER, normalizeMessage } from './normalize';

// The angle marks are written as code points, never raw characters (a raw U+2028 once slipped into a source file).
const L = String.fromCharCode(0x2039);
const R = String.fromCharCode(0x203a);
const tag = (name: string) => `${L}${name}${R}`;
const n = normalizeMessage;

describe('placeholders', () => {
  it('are four typed tags built from U+2039 and U+203A, exported from one constant', () => {
    expect(PLACEHOLDER).toEqual({ n: tag('n'), id: tag('id'), path: tag('path'), time: tag('time') });
    for (const p of Object.values(PLACEHOLDER)) {
      expect(p.codePointAt(0)).toBe(0x2039);
      expect(p.codePointAt(p.length - 1)).toBe(0x203a);
    }
  });
});

describe('what is masked', () => {
  it('numbers and ports become the number tag', () => {
    expect(n('Timeout 5000ms exceeded')).toBe(`Timeout ${tag('n')}ms exceeded`);
    expect(n('Expected: 12 Received: 3.5')).toBe(`Expected: ${tag('n')} Received: ${tag('n')}`);
    expect(n('connect ECONNREFUSED 127.0.0.1:5432')).toBe(`connect ECONNREFUSED ${tag('n')}:${tag('n')}`);
  });

  it('hex runs, UUIDs, long tokens, Bearer values and memory addresses become the id tag', () => {
    expect(n('commit 1a2b3c4d5e6f7a8b9c0d')).toBe(`commit ${tag('id')}`);
    expect(n('request 123e4567-e89b-42d3-a456-426614174000 failed')).toBe(`request ${tag('id')} failed`);
    expect(n('segfault at 0x7ffd5e8a3b10')).toBe(`segfault at ${tag('id')}`);
    expect(n('key sk8f3Kd92LmQp7Zx41AbCdEfGh0J failed')).toBe(`key ${tag('id')} failed`);
    expect(n('Authorization: Bearer abc.def-123_456')).toBe(`Authorization: Bearer ${tag('id')}`);
  });

  it('timestamps become the time tag', () => {
    expect(n('at 2026-11-27T10:15:30.123Z it broke')).toBe(`at ${tag('time')} it broke`);
    expect(n('on 2026-11-27 10:15:30 +01:00 it broke')).toBe(`on ${tag('time')} it broke`);
    expect(n('on 2026-11-27 it broke')).toBe(`on ${tag('time')} it broke`);
    expect(n('after 10:15:30.5 it broke')).toBe(`after ${tag('time')} it broke`);
  });

  it('absolute paths, URLs and query strings become the path tag', () => {
    expect(n('at /repo/flake-lab/tests/lab.spec.ts:142:38')).toBe(`at ${tag('path')}`);
    expect(n('at C:\\Users\\dev\\proj\\src\\app.ts:10:5')).toBe(`at ${tag('path')}`);
    expect(n('GET http://127.0.0.1:56384/search?q=shoes&page=2 failed')).toBe(`GET ${tag('path')} failed`);
    expect(n('page.goto: net::ERR_CONNECTION_REFUSED at https://example.com/api/orders?id=7')).toBe(
      `page.goto: net::ERR_CONNECTION_REFUSED at ${tag('path')}`,
    );
    expect(n('redirected to /login?next=%2Fcart&x=1')).toBe(`redirected to /login${tag('path')}`);
  });

  it('emails are masked, not kept', () => {
    expect(n('user ana.b+test@mail.example.co.uk not found')).toBe(`user ${tag('id')} not found`);
  });

  it('ANSI colour codes are removed and whitespace is collapsed', () => {
    const ESC = String.fromCharCode(27);
    expect(n(`${ESC}[31mError${ESC}[39m:   two\n\n  lines\t here  `)).toBe('Error: two lines here');
  });

  it('plain words, names and error codes stay', () => {
    expect(n('page.goto: net::ERR_CONNECTION_REFUSED')).toBe('page.goto: net::ERR_CONNECTION_REFUSED');
    expect(n('Error: ENOSPC: no space left on device, write')).toBe('Error: ENOSPC: no space left on device, write');
    expect(n('strict mode violation: getByRole(\'button\', { name: \'Add item\' }) resolved to 2 elements')).toBe(
      `strict mode violation: getByRole('button', { name: 'Add item' }) resolved to ${tag('n')} elements`,
    );
    expect(n('ERR_INTERNET_DISCONNECTED_AND_OFFLINE_ERROR')).toBe('ERR_INTERNET_DISCONNECTED_AND_OFFLINE_ERROR'); // long but no digit: not a token
    expect(n('')).toBe('');
  });

  it('the fake lab token never survives, with or without Bearer', () => {
    const fake = 'FAKE-TOKEN-NOT-A-SECRET-000000';
    for (const text of [`authorization: Bearer ${fake}`, `token=${fake}`, `GET /api authorization: Bearer ${fake}\nsecond line ${fake}`]) {
      const out = n(text);
      expect(out, text).not.toContain('FAKE');
      expect(out, text).not.toContain('SECRET');
      expect(out, text).not.toContain('000000');
    }
  });

  it('caps the input it reads and the text it returns', () => {
    expect(MAX_INPUT_CHARS).toBeGreaterThan(MAX_NORMALISED_CHARS);
    const long = Array.from({ length: 5000 }, (_, i) => `word${String.fromCharCode(97 + (i % 26))}x`).join(' ');
    expect(n(long).length).toBeLessThanOrEqual(MAX_NORMALISED_CHARS);
    expect(n('x'.repeat(MAX_INPUT_CHARS * 2)).length).toBeLessThanOrEqual(MAX_NORMALISED_CHARS);
  });
});

describe('property tests', () => {
  const word = fc.stringMatching(/^[g-z][a-z]{2,7}$/); // starts outside a-f, so it is never a hex run
  const uuid = fc.uuid();
  const time = fc.date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2030-01-01T00:00:00Z'), noInvalidDate: true }).map((d) => d.toISOString());
  const int = fc.integer({ min: 0, max: 9_999_999 });

  it('changing numbers, timestamps or UUIDs does not change the result', () => {
    fc.assert(
      fc.property(word, word, int, int, uuid, uuid, time, time, (a, b, n1, n2, u1, u2, t1, t2) => {
        const make = (num: number, id: string, at: string) => `${a} failed after ${num} ms for ${id} at ${at} while ${b}`;
        expect(n(make(n1, u1, t1))).toBe(n(make(n2, u2, t2)));
      }),
      { numRuns: 300 },
    );
  });

  it('changing words changes the result', () => {
    fc.assert(
      fc.property(word, word, (a, b) => {
        fc.pre(a !== b);
        expect(n(`error in ${a} step 5`)).not.toBe(n(`error in ${b} step 5`));
      }),
      { numRuns: 300 },
    );
  });

  it('is deterministic and never grows past the cap, for any text', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 400 }), (s) => {
        const out = n(s);
        expect(out).toBe(n(s));
        expect(out.length).toBeLessThanOrEqual(MAX_NORMALISED_CHARS);
      }),
      { numRuns: 300 },
    );
  });
});

describe('timing (untrusted text: linear, bounded)', () => {
  const time = (f: () => void) => {
    const t0 = performance.now();
    f();
    return performance.now() - t0;
  };
  const MB = 1_000_000;

  it('a 1 MB single-line message takes under 500 ms', () => {
    const ms = time(() => n('x'.repeat(MB)));
    expect(ms).toBeLessThan(500);
  });

  it('1 MB of "a." repeated takes under 500 ms', () => {
    const ms = time(() => n('a.'.repeat(MB / 2)));
    expect(ms).toBeLessThan(500);
  });

  it('1 MB of nasty repeats for each rule takes under 500 ms each', () => {
    const nasty = [
      '0'.repeat(MB),
      'a1'.repeat(MB / 2),
      '/a'.repeat(MB / 2),
      'http://'.repeat(MB / 7),
      'Bearer '.repeat(MB / 7),
      '@a.'.repeat(MB / 3),
      '-'.repeat(MB),
      '1:'.repeat(MB / 2),
      `${String.fromCharCode(27)}[`.repeat(MB / 2),
      `${'a'.repeat(30)} `.repeat(MB / 31),
      'C:\\a\\'.repeat(MB / 6),
      '2026-11-27T'.repeat(MB / 11),
      '?a=b&'.repeat(MB / 5),
      '0x'.repeat(MB / 2),
    ];
    for (const text of nasty) {
      const ms = time(() => n(text));
      expect(ms, text.slice(0, 12)).toBeLessThan(500);
    }
  });

  it('100,000 distinct short messages take under 2 s', () => {
    const ms = time(() => {
      for (let i = 0; i < 100_000; i++) n(`Error: item${i % 977} failed at /repo/src/f${i}.ts:${i}:${i % 90} after ${i} ms (id ${i * 7919})`);
    });
    expect(ms).toBeLessThan(2000);
  });
});
