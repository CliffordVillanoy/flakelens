import { test, expect } from '@playwright/test';
import { openApp, trySample } from './helpers';

test('sample data reaches a ranked list and an open Flaky test in well under 2 minutes of user steps', async ({ page }) => {
  const started = Date.now();
  await openApp(page);
  await trySample(page);
  const firstFlaky = page.locator('.ranked-row', { has: page.locator('[data-pill]', { hasText: 'Flaky' }) }).first();
  await expect(firstFlaky).toBeVisible();
  await expect(page.getByRole('link', { name: /^why\?/ })).toHaveCount(3);
  await firstFlaky.getByRole('link').first().click();
  await expect(page.locator('aside h2')).toBeVisible();
  await expect(page.getByRole('region', { name: 'What this means' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Latest failure' })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(120_000);
});

test('"Try sample data" navigates every time (50 clicks)', async ({ page }) => {
  test.setTimeout(240_000);
  for (let i = 0; i < 50; i++) {
    await page.goto('./');
    await page.getByRole('button', { name: 'Try sample data' }).click();
    await expect(page, `click ${i + 1}`).toHaveURL(/#\/tests$/);
    await expect(page.locator('.ranked-row').first(), `click ${i + 1}`).toBeVisible();
  }
});

test('the table recovers after its container was hidden at phone width and the window is resized to desktop', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await openApp(page);
  await trySample(page);
  const rows = page.locator('.ranked-row');
  await expect(rows.first()).toBeVisible();
  await rows.first().getByRole('link').first().click();
  await expect(page.locator('aside h2')).toBeVisible();
  await expect(page.locator('.listpane').first()).toBeHidden(); // the list is hidden behind the full-screen panel
  await page.getByRole('link', { name: 'Close panel' }).click();
  await expect(rows.first()).toBeVisible();

  // Resize to desktop with the panel open (list hidden), then close and resize again.
  await rows.first().getByRole('link').first().click();
  await expect(page.locator('.listpane').first()).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect.poll(() => rows.count()).toBeGreaterThan(0);
  await page.getByRole('link', { name: 'Close panel' }).click();
  await page.setViewportSize({ width: 600, height: 900 });
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect.poll(() => rows.count()).toBeGreaterThan(0);
});
