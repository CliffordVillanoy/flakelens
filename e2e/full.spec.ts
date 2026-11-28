import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { addFiles, openApp, trySample } from './helpers';

const FAKE = 'FAKE-TOKEN-NOT-A-SECRET-000000';

async function openFlakyFull(page: Page) {
  await openApp(page);
  await trySample(page);
  await page.evaluate(() => (window.location.hash = '#/tests?status=flaky'));
  await page.locator('.ranked-row a[data-test-id]').first().click();
  await page.getByRole('complementary').getByRole('link', { name: 'Open full view' }).click();
  await expect(page).toHaveURL(/#\/tests\/[^/]+\/full\?status=flaky$/);
}

test('sample: open a flaky test, its full view, jump to evidence, back to the list with the filter kept', async ({ page }) => {
  await openFlakyFull(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page.getByRole('heading', { level: 2, name: 'Run timeline' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Failure log' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'What it depends on' })).toBeVisible();

  // An evidence chip jumps to its line in the log and puts focus there.
  const chip = page.getByRole('button', { name: /Quoted from the log · line \d+/ }).first();
  if (await chip.count()) {
    await chip.click();
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-line'));
    expect(focused).not.toBeNull();
  }

  await page.getByRole('link', { name: 'Back to tests' }).click();
  await expect(page).toHaveURL(/#\/tests\?status=flaky$/);
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  await expect(page.locator('.ranked-row a[data-test-id]').first()).toBeFocused(); // the row it left is focused again
});

test('a sample test that never failed says so', async ({ page }) => {
  await openApp(page);
  await trySample(page);
  await page.evaluate(() => (window.location.hash = '#/tests?q=shows heading'));
  await page.locator('.ranked-row a[data-test-id]').first().click();
  await page.getByRole('complementary').getByRole('link', { name: 'Open full view' }).click();
  await expect(page.getByText('No failures in the loaded runs')).toBeVisible();
});

test('the keyboard reaches back, copy, the log search and the log itself; Esc clears the search', async ({ page }) => {
  await openFlakyFull(page);
  await page.getByRole('link', { name: 'Back to tests' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Copy test name' })).toBeFocused();
  const box = page.getByRole('searchbox', { name: 'Search the log' });
  await box.focus();
  await page.keyboard.type('timeout');
  await page.keyboard.press('Escape');
  await expect(box).toHaveValue('');
  await expect(page.getByRole('region', { name: /^Log for / })).toBeVisible();
});

test('phone width: one column, nothing scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await openFlakyFull(page);
  await expect(page.getByRole('heading', { level: 2, name: 'What it depends on' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('a 5 MB log draws at most 150 rows, stays responsive, searches the whole log, and a token never reaches the page', async ({ page }) => {
  test.setTimeout(120_000);
  const lines = Array.from({ length: 61_204 }, (_, i) => `${i + 1} GET /api/orders/12345 failed with status 503 after 30000ms retry=2 host=db-7.internal`);
  lines[41] = `Timeout 30000ms exceeded while waiting for locator('#pay-now') token=${FAKE}`;
  const message = lines.join('\n');
  expect(message.length).toBeGreaterThan(5_000_000);
  const report = (status: string, withError: boolean, start: string) => ({
    config: {},
    stats: { startTime: start },
    suites: [
      {
        title: 'big.spec.ts',
        file: 'big.spec.ts',
        specs: [
          {
            title: 'big log',
            file: 'big.spec.ts',
            tests: [{ projectName: 'chromium', results: [{ status, retry: 0, duration: 100, ...(withError ? { error: { message } } : {}) }] }],
          },
        ],
      },
    ],
  });
  const dir = path.resolve('e2e/fixtures/biglog');
  mkdirSync(dir, { recursive: true });
  const f1 = path.join(dir, 'run-a.json');
  const f2 = path.join(dir, 'run-b.json');
  writeFileSync(f1, JSON.stringify(report('failed', true, '2026-11-20T10:00:00.000Z')));
  writeFileSync(f2, JSON.stringify(report('passed', false, '2026-11-21T10:00:00.000Z')));

  await openApp(page);
  await addFiles(page, [f1, f2]);
  await expect(page.getByRole('heading', { level: 1, name: 'Tests ranked by fix priority' })).toBeVisible({ timeout: 90_000 });
  await page.evaluate(() => (window.location.hash = '#/tests?q=big'));
  await page.locator('.ranked-row a[data-test-id]').first().click({ timeout: 90_000 });
  await page.getByRole('complementary').getByRole('link', { name: 'Open full view' }).click();
  const region = page.getByRole('region', { name: /^Log for / });
  await expect(region).toBeVisible({ timeout: 60_000 });

  const rows = () => page.locator('[data-line]').count();
  expect(await rows()).toBeGreaterThan(0);
  expect(await rows()).toBeLessThanOrEqual(150);
  await expect(page.getByText(/^Lines \d+ to \d+ of 61,204$/)).toBeVisible();

  // Jumping to the end keeps the drawn rows under the limit.
  await region.focus();
  await page.keyboard.press('End');
  await expect(page.locator('[data-line="61204"]')).toBeAttached();
  expect(await rows()).toBeLessThanOrEqual(150);

  // Search covers the whole log and answers quickly.
  const t0 = Date.now();
  await page.getByRole('searchbox', { name: 'Search the log' }).fill('status 503');
  await expect(page.getByRole('status').filter({ hasText: /^1 of / })).toBeVisible({ timeout: 15_000 });
  expect(Date.now() - t0).toBeLessThan(15_000);

  // The token is on line 42 of the raw log: it is masked on screen and in the page.
  await page.getByRole('searchbox', { name: 'Search the log' }).fill('pay-now');
  await expect(page.locator('[data-line="42"]')).toContainText('[redacted]');
  expect(await page.evaluate(() => document.body.innerHTML.includes('FAKE-TOKEN'))).toBe(false);
});
