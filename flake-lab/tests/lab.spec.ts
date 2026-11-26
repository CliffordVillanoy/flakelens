import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { labMs, labRandom } from '../prng';

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
