import { test, expect } from '@playwright/test';
import { openApp, trySample } from './helpers';

// DEV-28 item 8 (decisions 4 and 7): measured in a real browser.
const rowHeights = (page: import('@playwright/test').Page) =>
  page.locator('.ranked-row').evaluateAll((els) => els.slice(0, 8).map((e) => Math.round(e.getBoundingClientRect().height)));

test('Comfortable rows are at least 56px with the path on a second line; Compact rows are 32px, one line, path on hover only', async ({ page }) => {
  await openApp(page);
  await trySample(page);
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  // DESIGN.md: 56px is the minimum. With 12px cell padding the two text lines make rows 62 to 66px (measured).
  for (const h of await rowHeights(page)) expect(h).toBeGreaterThanOrEqual(56);
  const first = page.locator('.ranked-row').first();
  await expect(first.locator('.truncate.font-mono')).toHaveCount(1); // the path line

  await page.getByRole('button', { name: 'Compact' }).click();
  expect(new Set(await rowHeights(page))).toEqual(new Set([32]));
  await expect(page.locator('.ranked-row').first().locator('.truncate.font-mono')).toHaveCount(0);
  const title = await page.locator('.ranked-row a[data-test-id]').first().getAttribute('title');
  expect(title).toContain('.spec'); // the path is in the hover title
});

test('the test panel is 600px wide and its headings are weight 600', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await trySample(page);
  await page.locator('.ranked-row a[data-test-id]').first().click();
  const panel = page.locator('aside.test-panel');
  await expect(panel).toBeVisible();
  expect(Math.round((await panel.boundingBox())!.width)).toBe(600);
  const weights = await panel.locator('h2, h3').evaluateAll((els) => els.map((e) => getComputedStyle(e).fontWeight));
  expect(weights.length).toBeGreaterThan(0);
  expect([...new Set(weights)]).toEqual(['600']);
});

test('the header says "Local only" below 1000px and the full line from 1000px up', async ({ page }) => {
  await openApp(page);
  await trySample(page);
  const full = page.getByText('Nothing leaves this browser');
  const short = page.getByText('Local only');
  await page.setViewportSize({ width: 800, height: 900 });
  await expect(short).toBeVisible();
  expect(await full.evaluate((e) => Math.round(e.getBoundingClientRect().width))).toBeLessThanOrEqual(1); // visually hidden, kept as the accessible name
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(full).toBeVisible();
  expect(await short.evaluate((e) => Math.round(e.getBoundingClientRect().width))).toBe(0);
});
