import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { MAX_INPUT_CHARS, REDACTED, redactSecrets } from './normalize';

const FAKE = 'FAKE-TOKEN-NOT-A-SECRET-000000';

describe('redactSecrets', () => {
  it('masks Bearer values and keeps the rest of the line readable', () => {
    expect(redactSecrets(`GET /api/orders authorization: Bearer ${FAKE}`)).toBe(`GET /api/orders authorization: Bearer ${REDACTED}`);
    expect(redactSecrets('Authorization: Bearer abc.def-123_456 sent')).toBe(`Authorization: Bearer ${REDACTED} sent`);
  });

  it('masks token, key, password and secret assignments, with = : quotes and JSON', () => {
    expect(redactSecrets('token=hunter2 and more')).toBe(`token=${REDACTED} and more`);
    expect(redactSecrets('apikey: abc123 failed')).toBe(`apikey: ${REDACTED} failed`);
    expect(redactSecrets('api_key = "s3cr3t value"')).toBe(`api_key = ${REDACTED}`);
    expect(redactSecrets('{"password":"p@ss w0rd","user":"ana"}')).toBe(`{"password":${REDACTED},"user":"ana"}`);
    expect(redactSecrets("client_secret: 'abc'")).toBe(`client_secret: ${REDACTED}`);
    expect(redactSecrets('Secret: topsecret; next: 1')).toBe(`Secret: ${REDACTED}; next: 1`);
  });

  it('masks credentials inside a URL and long key-like runs, but not short words or short SHAs', () => {
    expect(redactSecrets('connect postgres://admin:pa55w0rd@db.local:5432/app failed')).toBe(`connect postgres://${REDACTED}@db.local:5432/app failed`);
    expect(redactSecrets('key sk8f3Kd92LmQp7Zx41AbCdEfGh0J rejected')).toBe(`key ${REDACTED} rejected`);
    expect(redactSecrets(`header x-auth: ${FAKE}`)).not.toContain('FAKE-TOKEN');
    expect(redactSecrets('commit 1a2b3c4 broke it')).toBe('commit 1a2b3c4 broke it'); // a short SHA is kept
    expect(redactSecrets('commit 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b broke it')).toBe(`commit ${REDACTED} broke it`); // a 40-character hex run cannot be told from a token
    expect(redactSecrets('page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:1/')).toBe('page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:1/');
    expect(redactSecrets('The token was refreshed. Passwords are hashed.')).toBe('The token was refreshed. Passwords are hashed.');
  });

  it('never double-masks, and leaves line breaks and line count alone', () => {
    const once = redactSecrets(`line1 token=abc\nline2 Bearer ${FAKE}\nline3`);
    expect(redactSecrets(once)).toBe(once);
    expect(once.split('\n')).toHaveLength(3);
    expect(once.split('\n')[2]).toBe('line3');
  });

  it('reads at most MAX_INPUT_CHARS', () => {
    expect(redactSecrets('x'.repeat(MAX_INPUT_CHARS * 3)).length).toBeLessThanOrEqual(MAX_INPUT_CHARS);
    expect(redactSecrets('')).toBe('');
  });

  it('property: the output never holds the secret that was put in', () => {
    const token = fc
      .stringMatching(/^[A-Za-z0-9]{12,40}$/)
      .map((s) => `K9${s}`) // always letters and digits, 14+ characters
      .filter((s) => /[A-Za-z]/.test(s) && /\d/.test(s));
    const long = fc.stringMatching(/^[A-Za-z0-9-]{24,60}$/).filter((s) => /[A-Za-z]/.test(s) && /\d/.test(s));
    const words = fc.stringMatching(/^[a-z ]{0,40}$/);
    fc.assert(
      fc.property(token, long, words, words, (t, l, before, after) => {
        const lines = [`${before} Bearer ${t} ${after}`, `${before} token=${t};${after}`, `${before} password: ${t}`, `${before} key ${l} ${after}`, `${before} https://u:${t}@host/${after}`];
        for (const line of lines) {
          const out = redactSecrets(line);
          expect(out, line).not.toContain(t);
          expect(out, line).not.toContain(l);
        }
        expect(redactSecrets(`${before}\n${l}\n${after}`).split('\n')).toHaveLength(3);
      }),
      { numRuns: 300 },
    );
  });
});

describe('redactSecrets timing: 15 hostile 1 MB strings, each under 500 ms', () => {
  const MB = 1_000_000;
  const hostile: [string, string][] = [
    ['a', 'a'.repeat(MB)],
    ['spaces', ' '.repeat(MB)],
    ['newlines', '\n'.repeat(MB)],
    ['digits', '5'.repeat(MB)],
    ['token= repeated', 'token='.repeat(MB / 6)],
    ['Bearer repeated', 'Bearer '.repeat(MB / 7)],
    ['password: repeated', 'password: '.repeat(MB / 10)],
    ['key: " repeated', 'key: "'.repeat(MB / 6)],
    ['http:// repeated', 'http://'.repeat(MB / 7)],
    ['://a: repeated', 'a://a:'.repeat(MB / 6)],
    ['a1 repeated', 'a1'.repeat(MB / 2)],
    ['30-char words', `${'a1'.repeat(15)} `.repeat(MB / 31)],
    ['@ repeated', '@a.'.repeat(MB / 3)],
    ['-', '-'.repeat(MB)],
    ['unique words', Array.from({ length: MB / 10 }, (_, i) => `w${i}x`).join(' ')],
  ];
  it.each(hostile)('%s', (_label, text) => {
    const t0 = performance.now();
    redactSecrets(text);
    expect(performance.now() - t0).toBeLessThan(500);
  });
});
