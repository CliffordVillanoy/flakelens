import { test, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { labRandom } from '../prng';

const run = Number(process.env.LAB_RUN ?? 0);
const commit = Number((process.env.LAB_COMMIT ?? 'c0').slice(1));
const appUrl = pathToFileURL(fileURLToPath(new URL('../app/index.html', import.meta.url))).href;
const NAMES = ['ana', 'ben', 'cleo', 'dev', 'eli', 'fay', 'gus', 'hal', 'ivy', 'jo'];

test('stable: shows heading', async ({ page }) => {
  await page.goto(appUrl);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Flake Lab Shop');
});

test('stable: adds item', async ({ page }) => {
  await page.goto(appUrl);
  await page.getByRole('button', { name: 'Add item' }).click();
  await expect(page.locator('#cart li')).toHaveCount(1);
});

test('stable: shows footer', async ({ page }) => {
  await page.goto(appUrl);
  await expect(page.locator('footer')).toHaveText('Flake Lab footer');
});

test('flaky: timing', async ({ page }, info) => {
  const r = labRandom(run, info.title, info.retry)();
  // Seeded 0-400 ms delay with a gap around the 200 ms wait, so real timer jitter cannot flip the outcome.
  const delay = Math.round(r < 0.5 ? r * 300 : 250 + (r - 0.5) * 300);
  await page.goto(`${appUrl}?delay=${delay}`);
  await page.waitForTimeout(200);
  expect(await page.locator('#ready').isVisible()).toBe(true); // no auto-wait: this is the bug
});

test('flaky: random data', async ({ page }, info) => {
  const name = NAMES[Math.floor(labRandom(run, info.title, info.retry)() * NAMES.length)]!;
  await page.goto(appUrl);
  await page.locator('#username').fill(name);
  await page.getByRole('button', { name: 'Check name' }).click();
  await expect(page.locator('#name-result')).toHaveText('available', { timeout: 1000 });
});

test('failing: wrong heading', async ({ page }) => {
  await page.goto(appUrl);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome to Flake Lab', { timeout: 1000 });
});

test('unproven: regression', async ({ page }) => {
  await page.goto(`${appUrl}?commit=${commit}`);
  await expect(page.locator('#total')).toHaveText('Total: 10', { timeout: 1000 });
});

if (run === 11) {
  test('new: added last run', async ({ page }) => {
    await page.goto(appUrl);
    await expect(page.locator('footer')).toBeVisible();
  });
}
