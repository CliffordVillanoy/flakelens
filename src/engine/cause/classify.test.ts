import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { classifyFailure, failureText, plainText, verifyEvidence } from './classify';

const ESC = String.fromCharCode(27);
const c = (message: string, stack = '', extra: Record<string, unknown> = {}) => classifyFailure({ message, stack, ...extra });

describe('categories', () => {
  it('locator: strict mode violation is a high-confidence locator cause with its line quoted', () => {
    const r = c("Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Add item' }) resolved to 2 elements:\n    1) <button id=\"add\">Add item</button>");
    expect(r.category).toBe('locator');
    expect(r.confidence).toBe('high');
    expect(r.evidence[0]).toEqual({ line: 1, text: expect.stringContaining('strict mode violation') });
  });

  it('network: connection refused, net::ERR_*, DNS and 5xx', () => {
    expect(c('page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:47123/api/orders').category).toBe('network');
    expect(c('connect ECONNREFUSED 127.0.0.1:5432').category).toBe('network');
    expect(c('getaddrinfo ENOTFOUND api.example.com').category).toBe('network');
    const r = c('Error: expect(received).toBe(expected) // Object.is equality\n\nExpected: 200\nReceived: 503');
    expect(r.category).toBe('network');
    expect(r.evidence.map((e) => e.text)).toContain('Received: 503');
    expect(r.evidence.find((e) => e.text === 'Received: 503')!.line).toBe(4);
  });

  it('environment: out of memory, disk full, target closed', () => {
    expect(c('Error: ENOSPC: no space left on device, write').category).toBe('environment');
    expect(c('FATAL ERROR: JavaScript heap out of memory').category).toBe('environment');
    expect(c('Error: Target page, context or browser has been closed').category).toBe('environment');
  });

  it('timing: timeouts and waits, never above medium without a stronger sign', () => {
    const r = c('Test timeout of 30000ms exceeded.');
    expect(r.category).toBe('timing');
    expect(r.confidence).not.toBe('high');
  });

  it('time, sharedState, order, concurrency, infrastructure', () => {
    expect(c('Expected: "2026-11-27"\nReceived: "2026-11-28"').category).toBe('time');
    expect(c('Error: user "ana" already exists').category).toBe('sharedState');
    expect(c('this test depends on a previous test').category).toBe('order');
    expect(c('a race condition between two saves').category).toBe('concurrency');
    expect(c('HttpError: 429 Too Many Requests').category).toBe('infrastructure');
  });

  it('unknown when no rule fires: low confidence, no evidence, never a forced guess', () => {
    const r = c('Error: expect(received).toBe(expected) // Object.is equality\n\nExpected: 0\nReceived: 1');
    expect(r).toEqual({ category: 'unknown', confidence: 'low', evidence: [] });
    expect(c('')).toEqual({ category: 'unknown', confidence: 'low', evidence: [] });
  });
});

describe('evidence', () => {
  it('library frames are dropped, project frames are kept, at most 5 lines', () => {
    const stack = [
      'Error: ENOSPC: no space left on device, write',
      '    at Object.fn (/repo/flake-lab/lib/inject.ts:15:27)',
      '    at Internals.inst._zod.check (/repo/node_modules/zod/v4/core/schemas.js:2614:23)',
      '    at node:events:519:28',
      '    at failDiskFull (/repo/flake-lab/lib/inject.ts:17:5)',
      '    at /repo/flake-lab/tests/lab.spec.ts:142:38',
      '    at /repo/flake-lab/tests/lab.spec.ts:150:38',
    ].join('\n');
    const r = c('Error: ENOSPC: no space left on device, write', stack);
    const texts = r.evidence.map((e) => e.text);
    expect(texts.some((t) => t.includes('node_modules'))).toBe(false);
    expect(texts.some((t) => t.includes('node:events'))).toBe(false);
    expect(texts.some((t) => t.includes('/repo/flake-lab/lib/inject.ts'))).toBe(true);
    expect(r.evidence.length).toBeLessThanOrEqual(5);
    expect(r.evidence.map((e) => e.line)).toEqual([...r.evidence.map((e) => e.line)].sort((a, b) => a - b));
  });

  it('works on ANSI-coloured text: lines are counted and quoted without the colour codes', () => {
    const msg = `Error: ${ESC}[2mexpect(${ESC}[22m${ESC}[31mlocator${ESC}[39m${ESC}[2m).${ESC}[22mtoBeVisible${ESC}[2m()${ESC}[22m failed`;
    const r = c(msg);
    expect(r.category).toBe('locator');
    expect(r.evidence[0]!.text).toBe('Error: expect(locator).toBeVisible() failed');
    expect(r.evidence[0]!.line).toBe(1);
  });

  it('failureText uses the stack when it already starts with the message, else both', () => {
    expect(failureText('boom', 'boom\n  at x')).toBe('boom\n  at x');
    expect(failureText('boom', '  at x')).toBe('boom\n  at x');
    expect(failureText('boom', '')).toBe('boom');
    expect(plainText(`a${ESC}[31mb${ESC}[0m`)).toBe('ab');
  });

  it('property: every evidence text occurs in the input at its 1-based line, and the classifier output verifies', () => {
    const triggers = [
      "locator.click: Error: strict mode violation: getByRole('button') resolved to 2 elements",
      'page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:1/',
      'Error: ENOSPC: no space left on device, write',
      'Test timeout of 30000ms exceeded.',
      'Expected: 200',
      'Received: 503',
      'user already exists',
    ];
    fc.assert(
      fc.property(fc.array(fc.stringMatching(/^[ a-z0-9_:/.()-]{0,60}$/), { maxLength: 30 }), fc.array(fc.constantFrom(...triggers), { minLength: 0, maxLength: 4 }), fc.nat(40), (filler, hits, at) => {
        const lines = [...filler];
        for (const h of hits) lines.splice(Math.min(at, lines.length), 0, `   ${h}   `);
        const text = lines.join('\n');
        const r = classifyFailure({ message: text, stack: '' });
        const all = plainText(failureText(text, '')).split('\n');
        for (const e of r.evidence) {
          expect(all[e.line - 1], `line ${e.line}`).toContain(e.text);
          expect(e.text).toBe(e.text.trim());
        }
        expect(verifyEvidence(text, r.evidence).every(Boolean)).toBe(true);
        expect(r.evidence.length).toBeLessThanOrEqual(5);
      }),
      { numRuns: 300 },
    );
  });

  it('property: a changed or shifted line does not verify', () => {
    fc.assert(
      fc.property(fc.array(fc.uuid(), { minLength: 1, maxLength: 12 }), fc.nat(12), (ids, at) => {
        const lines = ids.map((id) => `filler ${id}`);
        lines.splice(Math.min(at, lines.length), 0, 'Error: ENOSPC: no space left on device, write');
        const text = lines.join('\n');
        const r = classifyFailure({ message: text, stack: '' });
        expect(r.evidence.length).toBeGreaterThan(0);
        expect(verifyEvidence(text, r.evidence).every(Boolean)).toBe(true);
        expect(verifyEvidence(`one more line first\n${text}`, r.evidence).some(Boolean)).toBe(false); // shifted
        expect(verifyEvidence(text.replace('ENOSPC', 'ENOSPX'), r.evidence).some(Boolean)).toBe(false); // changed
        expect(verifyEvidence(text, [{ line: lines.length + 5, text: 'x' }])).toEqual([false]); // past the end
        expect(verifyEvidence(text, [{ line: 0, text: 'x' }])).toEqual([false]);
      }),
      { numRuns: 200 },
    );
  });
});

describe('correlation and environment events', () => {
  it('a correlation hint changes confidence, never the quoted evidence', () => {
    const msg = 'Error: expect(locator).toBeVisible() failed\nLocator: getByRole(\'link\')\nTimeout: 5000ms';
    const plain = c(msg);
    const hinted = c(msg, '', { correlation: { oneBrowser: true } });
    expect(hinted.evidence).toEqual(plain.evidence);
    expect(hinted.category).toBe(plain.category);
    const order = ['low', 'medium', 'high'];
    expect(order.indexOf(hinted.confidence)).toBeGreaterThanOrEqual(order.indexOf(plain.confidence));
    expect(hinted.hint).toBe('oneBrowser');
    expect(plain.hint).toBeUndefined();
  });

  it('an environment event is infrastructure unless a stronger test-specific rule fires', () => {
    const reset = 'Error: apiRequestContext.get: socket hang up (ECONNRESET)';
    expect(c(reset).category).toBe('network');
    const ev = c(reset, '', { environmentEvent: true });
    expect(ev.category).toBe('infrastructure');
    expect(ev.hint).toBe('environmentEvent');
    expect(ev.evidence.some((e) => e.text.includes('ECONNRESET'))).toBe(true);
    // a strict mode violation is test-specific and strong: it stays a locator cause
    expect(c("locator.click: Error: strict mode violation: getByRole('button') resolved to 2 elements", '', { environmentEvent: true }).category).toBe('locator');
    // nothing recognisable in an event: still infrastructure, low evidence
    expect(c('something odd', '', { environmentEvent: true }).category).toBe('infrastructure');
  });
});

describe('robustness', () => {
  it('never throws on odd input, and stays within its caps', () => {
    for (const s of ['', ' ', '\n\n\n', ESC, `${ESC}[`, '\u0000'.repeat(50), '🙂'.repeat(300), 'x'.repeat(300_000)]) {
      const r = c(s, s);
      expect(r.evidence.length).toBeLessThanOrEqual(5);
      for (const e of r.evidence) expect(e.text.length).toBeLessThanOrEqual(300);
    }
  });

  it('1 MB hostile messages classify in under 500 ms', () => {
    const MB = 1_000_000;
    for (const text of ['Expected'.repeat(MB / 8), 'a.'.repeat(MB / 2), '\n'.repeat(MB), 'Timeout: 5'.repeat(MB / 10), `${ESC}[3`.repeat(MB / 3), 'net::ERR_'.repeat(MB / 9)]) {
      const t0 = performance.now();
      c(text, text);
      expect(performance.now() - t0, text.slice(0, 12)).toBeLessThan(500);
    }
  });
});
