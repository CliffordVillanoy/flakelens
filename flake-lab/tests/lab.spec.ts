import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { labMs, labRandom } from '../prng';
import { failDiskFull, logRequest, resettingServer } from '../lib/inject';

const run = Number(process.env.LAB_RUN ?? 0);
const commit = Number((process.env.LAB_COMMIT ?? 'c0').slice(1));
const appUrl = pathToFileURL(fileURLToPath(new URL('../app/index.html', import.meta.url))).href;
const NAMES = ['ana', 'ben', 'cleo', 'dev', 'eli', 'fay', 'gus', 'hal', 'ivy', 'jo'];

// Slow-page simulation (DEV-34). The app finishes loading after a seeded wait (?slow=ms) and the tests really wait for
// it, so the durations in the reports are measured, not typed in. Ranges (README): stable 0.5 to 3 s; flaky, failing
// and unproven 3 to 40 s per attempt; a failing attempt can end at a 5 to 30 s timeout. The waits come from their own
// seeded stream (labMs), so they never change a pass or fail.
const STABLE_MS = (title: string, retry: number) => labMs(run, title, retry, 400, 2300); // plus about 0.4 s of page start: under 3 s
const SLOW_MS = (title: string, retry: number) => labMs(run, title, retry, 3000, 38000, 0.6); // plus page start: under 40 s
const TIMEOUT_MS = (title: string, retry: number) => labMs(run, `${title}:timeout`, retry, 5000, 30000);

const settled = (page: Page, ms: number) => expect(page.locator('#status')).toHaveText('Ready', { timeout: ms + 10_000 });

test('stable: shows heading', async ({ page }, info) => {
  const slow = STABLE_MS(info.title, info.retry);
  await page.goto(`${appUrl}?slow=${slow}`);
  await settled(page, slow);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Flake Lab Shop');
});

test('stable: adds item', async ({ page }, info) => {
  const slow = STABLE_MS(info.title, info.retry);
  await page.goto(`${appUrl}?slow=${slow}`);
  await settled(page, slow);
  await page.getByRole('button', { name: 'Add item' }).click();
  await expect(page.locator('#cart li')).toHaveCount(1);
});

test('stable: shows footer', async ({ page }, info) => {
  const slow = STABLE_MS(info.title, info.retry);
  await page.goto(`${appUrl}?slow=${slow}`);
  await settled(page, slow);
  await expect(page.locator('footer')).toHaveText('Flake Lab footer');
});

test('flaky: timing', async ({ page }, info) => {
  const r = labRandom(run, info.title, info.retry)();
  // Seeded 0-400 ms delay with a gap around the 200 ms wait, so real timer jitter cannot flip the outcome.
  const delay = Math.round(r < 0.5 ? r * 300 : 250 + (r - 0.5) * 300);
  const slow = SLOW_MS(info.title, info.retry);
  await page.goto(`${appUrl}?delay=${delay}&slow=${slow}`);
  await page.waitForTimeout(200);
  const visible = await page.locator('#ready').isVisible(); // no auto-wait: this is the bug
  await settled(page, slow); // the slow page keeps the attempt busy either way
  expect(visible).toBe(true);
});

test('flaky: random data', async ({ page }, info) => {
  const name = NAMES[Math.floor(labRandom(run, info.title, info.retry)() * NAMES.length)]!;
  const slow = SLOW_MS(info.title, info.retry);
  await page.goto(`${appUrl}?slow=${slow}`);
  await page.locator('#username').fill(name);
  await page.getByRole('button', { name: 'Check name' }).click();
  // A taken name never turns "available": the check waits out its timeout and fails. An available one finishes with the page.
  await expect(page.locator('#name-result')).toHaveText('available', { timeout: TIMEOUT_MS(info.title, info.retry) });
  await settled(page, slow);
});

test('failing: wrong heading', async ({ page }, info) => {
  await page.goto(appUrl);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome to Flake Lab', { timeout: TIMEOUT_MS(info.title, info.retry) });
});

test('unproven: regression', async ({ page }, info) => {
  const slow = labMs(run, info.title, info.retry, 3000, 12000);
  await page.goto(`${appUrl}?commit=${commit}&slow=${slow}`);
  await settled(page, slow);
  await expect(page.locator('#total')).toHaveText('Total: 10', { timeout: labMs(run, `${info.title}:timeout`, info.retry, 5000, 12000) });
});

test('flaky: cross-run only', async ({ page }, info) => {
  const slow = SLOW_MS(info.title, info.retry);
  await page.goto(`${appUrl}?slow=${slow}`);
  await settled(page, slow);
  // Fails both attempts on even runs and passes on odd runs: each commit (2 runs) mixes, but no run passes on retry.
  expect(run % 2, 'injected cross-run failure').toBe(1);
});

if (run === 11) {
  test('new: added last run', async ({ page }, info) => {
    const slow = STABLE_MS(info.title, info.retry);
    await page.goto(`${appUrl}?slow=${slow}`);
    await settled(page, slow);
    await expect(page.locator('footer')).toBeVisible();
  });
}

// ---- One test per cause (DEV-35) ----
// The lab injects each cause with a seeded outcome and the error text a real suite would show. It validates the
// classifier's text rules, not real mechanisms. Each of these takes 3 to 6 s of simulated slow page (all attempts) and fails
// about 45 % of the time, from its own seed, so every one has a mixed commit.
const FAIL_P = 0.45;
const CAUSE_MS = (title: string, retry: number) => labMs(run, title, retry, 3000, 6000);
const fails = (title: string, retry: number) => labRandom(run, title, retry)() < FAIL_P;

test('flaky: order dependency', async ({ page }, info) => {
  // Cause: an earlier test left an item in the cart, so a test that expects an empty cart fails when it runs after it.
  const slow = CAUSE_MS(info.title, info.retry);
  await page.goto(`${appUrl}?leftover=${fails(info.title, info.retry) ? 1 : 0}&slow=${slow}`);
  await settled(page, slow);
  expect(await page.locator('#cart li').count()).toBe(0);
});

test('flaky: stale data', async ({ page }, info) => {
  // Cause: shared data. A cached order number is one behind the test's expectation.
  const slow = CAUSE_MS(info.title, info.retry);
  await page.goto(`${appUrl}?order=${fails(info.title, info.retry) ? 1000 : 1001}&slow=${slow}`);
  await settled(page, slow);
  expect(await page.locator('#order').innerText()).toBe('Order #1001');
});

test('flaky: external call', async ({ page }, info) => {
  // Cause: an outside service. 25 % of the time nothing listens (connection refused), 20 % it answers 503, else it is fine.
  const r = labRandom(run, info.title, info.retry)();
  const slow = CAUSE_MS(info.title, info.retry);
  await page.goto(`${appUrl}?slow=${slow}`);
  await settled(page, slow);
  logRequest('http://127.0.0.1:47123/api/orders');
  if (r < 0.25) {
    await page.goto('http://127.0.0.1:47123/api/orders'); // real net::ERR_CONNECTION_REFUSED, nothing leaves the machine
  } else {
    await page.route('http://flake.test/**', (route) =>
      route.fulfill({ status: r < FAIL_P ? 503 : 200, contentType: 'text/plain', body: r < FAIL_P ? 'Service Unavailable' : 'ok' }),
    );
    const response = await page.goto('http://flake.test/api/orders');
    expect(response!.status()).toBe(200);
  }
});

test('flaky: low memory', async ({ page }, info) => {
  // Cause: the machine runs out of a resource (here a full disk) part way through the test.
  const slow = CAUSE_MS(info.title, info.retry);
  await page.goto(`${appUrl}?slow=${slow}`);
  await settled(page, slow);
  if (fails(info.title, info.retry)) failDiskFull();
});

test('flaky: lost update', async ({ page }, info) => {
  // Cause: a race. Two saves that overlap each read the old total, so one update is lost (11 instead of 12).
  const slow = CAUSE_MS(info.title, info.retry);
  await page.goto(`${appUrl}?overlap=${fails(info.title, info.retry) ? 1 : 0}&slow=${slow}`);
  await settled(page, slow);
  await page.getByRole('button', { name: 'Save twice' }).click();
  await page.waitForTimeout(400);
  expect(await page.locator('#saved').innerText()).toBe('Total: 12');
});

test('flaky: strict locator', async ({ page }, info) => {
  // Cause: the UI. A promotion adds a second "Add item" button, so the locator matches two elements.
  const slow = CAUSE_MS(info.title, info.retry);
  await page.goto(`${appUrl}?dup=${fails(info.title, info.retry) ? 1 : 0}&slow=${slow}`);
  await settled(page, slow);
  await page.getByRole('button', { name: 'Add item' }).click();
});

// Infrastructure event: in runs 6 and 7 (one commit) the service behind these five tests resets every connection. All five
// fail with the same message in both attempts of both runs, then pass again from run 8. Real ECONNRESET, from a local server.
const INFRA_RUNS = [6, 7];
for (const [title, path] of [
  ['infra: login page', '/login'],
  ['infra: search', '/search?q=shoes'],
  ['infra: cart api', '/api/cart'],
  ['infra: profile', '/api/profile'],
  ['infra: checkout', '/api/checkout'],
] as const) {
  test(title, async ({ page, request }, info) => {
    const slow = STABLE_MS(info.title, info.retry);
    await page.goto(`${appUrl}?slow=${slow}`);
    await settled(page, slow);
    if (INFRA_RUNS.includes(run)) {
      const server = await resettingServer();
      try {
        await request.get(`${server.url}${path}`);
      } finally {
        server.close();
      }
    }
  });
}
