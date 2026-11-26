import { describe, it, expect } from 'vitest';
import { CAUSE_RULES, MAX_LINE_CHARS } from './rules';

// One example the rule must match and one it must not. A new rule without an entry fails the first test.
const EXAMPLES: Record<string, { yes: string; no: string }> = {
  'timing.testTimeout': { yes: 'Test timeout of 30000ms exceeded.', no: 'Test finished in 30000ms' },
  'timing.timeoutError': { yes: 'TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.', no: 'Timeouts are configurable' },
  'timing.expectTimeout': { yes: 'Expected: visible\nTimeout: 5000ms', no: 'the timeout was long' },
  'timing.waitingFor': { yes: '  - waiting for locator(\'#ready\')', no: 'we are waiting for you' },
  'timing.fixedWait': { yes: 'await page.waitForTimeout(200)', no: 'await page.waitForURL(/x/)' },
  'locator.strict': { yes: "locator.click: Error: strict mode violation: getByRole('button') resolved to 2 elements", no: 'a strict mode of work' },
  'locator.notVisible': { yes: '  - element is not visible', no: 'the element is visible' },
  'locator.detached': { yes: '  - element is not attached to the DOM', no: 'the element is attached' },
  'locator.notFound': { yes: 'Error: element(s) not found', no: 'elements found' },
  'locator.visibleAssertion': { yes: 'Error: expect(locator).toBeVisible() failed', no: 'expect(page).toHaveURL() failed' },
  'locator.textAssertion': { yes: 'Error: expect(locator).toHaveText(expected) failed', no: 'expect(received).toBe(expected)' },
  'network.err': { yes: 'page.goto: net::ERR_CONNECTION_REFUSED at http://x/', no: 'net:: is a prefix' },
  'network.econnrefused': { yes: 'connect ECONNREFUSED 127.0.0.1:5432', no: 'the connection was fine' },
  'network.econnreset': { yes: 'Error: apiRequestContext.get: socket hang up (ECONNRESET)', no: 'reset the form' },
  'network.dns': { yes: 'getaddrinfo ENOTFOUND api.example.com', no: 'address info' },
  'network.http5xx': { yes: 'Expected: 200\nReceived: 503', no: 'Received: 404' },
  'network.etimedout': { yes: 'connect ETIMEDOUT 10.0.0.1:443', no: 'timed out once' },
  'environment.oom': { yes: 'FATAL ERROR: JavaScript heap out of memory', no: 'memory was fine' },
  'environment.disk': { yes: 'Error: ENOSPC: no space left on device, write', no: 'space on the left' },
  'environment.targetClosed': { yes: 'Error: Target page, context or browser has been closed', no: 'the target was reached' },
  'environment.workerCrash': { yes: 'Error: Worker process exited unexpectedly (code=null, signal=SIGKILL)', no: 'the worker finished' },
  'time.dateMismatch': { yes: 'Expected: "2026-11-27"\nReceived: "2026-11-28"', no: 'Expected: "abc"' },
  'time.clockMismatch': { yes: 'Expected: "10:15"\nReceived: "10:16"', no: 'Expected: "ten"' },
  'time.clockWords': { yes: 'fails around midnight in another timezone', no: 'a time to remember' },
  'time.random': { yes: 'used Math.random() to pick a name', no: 'a randomly chosen word' },
  'sharedState.exists': { yes: 'Error: user "ana" already exists', no: 'the user exists' },
  'sharedState.stale': { yes: 'got stale data from the cache', no: 'the data was fresh' },
  'order.previousTest': { yes: 'this test depends on a previous test', no: 'the test passed' },
  'order.hook': { yes: 'Error in "beforeAll" hook', no: 'a hook was added' },
  'concurrency.race': { yes: 'a race condition between two saves', no: 'a trace of the run' },
  'infrastructure.runner': { yes: 'HttpError: 429 Too Many Requests', no: 'a rate was set' },
  'infrastructure.setup': { yes: "browserType.launch: Executable doesn't exist at /ms-playwright/chromium", no: 'launch was quick' },
};

describe('rules as data', () => {
  it('every rule has an id, a category, a weight, a bounded pattern and a tip key from its category', () => {
    const ids = new Set<string>();
    for (const r of CAUSE_RULES) {
      expect(ids.has(r.id), `duplicate ${r.id}`).toBe(false);
      ids.add(r.id);
      expect(r.id.startsWith(`${r.category}.`), r.id).toBe(true);
      expect(['high', 'medium', 'low']).toContain(r.weight);
      expect(r.tip).toBe(`cause.${r.category}.tip`);
      expect(r.pattern.global || r.pattern.sticky, `${r.id} must not carry state`).toBe(false);
    }
    expect(CAUSE_RULES.length).toBeGreaterThanOrEqual(25);
  });

  it('covers the text the ticket lists', () => {
    const cats = new Set(CAUSE_RULES.map((r) => r.category));
    for (const c of ['timing', 'order', 'sharedState', 'network', 'environment', 'concurrency', 'locator', 'time', 'infrastructure']) expect(cats.has(c as never), c).toBe(true);
    const text = CAUSE_RULES.map((r) => r.pattern.source).join('\n');
    for (const needle of ['strict mode violation', 'net::ERR_', 'ECONNREFUSED', 'ECONNRESET', 'getaddrinfo', '5\\d\\d', 'Target', 'ENOSPC', 'memory', 'Timeout']) expect(text, needle).toContain(needle);
  });

  it('has a matching and a non-matching example for every rule', () => {
    expect(Object.keys(EXAMPLES).sort()).toEqual(CAUSE_RULES.map((r) => r.id).sort());
    for (const r of CAUSE_RULES) {
      expect(r.pattern.test(EXAMPLES[r.id]!.yes), `${r.id} should match`).toBe(true);
      expect(r.pattern.test(EXAMPLES[r.id]!.no), `${r.id} should not match`).toBe(false);
    }
  });
});

describe('ReDoS: every rule on 1 MB hostile strings', () => {
  const MB = 1_000_000;
  const hostile: [string, string][] = [
    ['a x 1 MB', 'a'.repeat(MB)],
    ['spaces', ' '.repeat(MB)],
    ['newlines', '\n'.repeat(MB)],
    ['digits', '5'.repeat(MB)],
    ['Expected repeated', 'Expected'.repeat(MB / 8)],
    ['Received: repeated', 'Received: '.repeat(MB / 10)],
    ['Timeout repeated', 'Timeout: '.repeat(MB / 9)],
    ['net::ERR_ repeated', 'net::ERR_'.repeat(MB / 9)],
    ['waiting for repeated', 'waiting for '.repeat(MB / 12)],
    ['expect(locator). repeated', 'expect(locator).'.repeat(MB / 16)],
    ['element repeated', 'element '.repeat(MB / 8)],
    ['dates', '2026-11-27 '.repeat(MB / 11)],
    ['"a." repeated', 'a.'.repeat(MB / 2)],
    ['status 5', 'status 5'.repeat(MB / 8)],
    ['unique-ish words', Array.from({ length: MB / 10 }, (_, i) => `w${i}x`).join(' ')],
  ];
  const cases = CAUSE_RULES.flatMap((r) => hostile.map(([label, text]) => [r.id, label, r, text] as const));

  it.each(cases)('%s on %s takes under 500 ms', (_id, _label, rule, text) => {
    const t0 = performance.now();
    rule.pattern.test(text);
    expect(performance.now() - t0).toBeLessThan(500);
  });

  it('a line is cut at MAX_LINE_CHARS before any rule sees it', () => {
    expect(MAX_LINE_CHARS).toBeLessThanOrEqual(5_000);
  });
});
