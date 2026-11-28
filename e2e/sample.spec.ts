import { test, expect } from '@playwright/test';
import { openApp, trySample } from './helpers';

test('sample data reaches a ranked list and an open Flaky test in well under 2 minutes of user steps', async ({ page }) => {
  const started = Date.now();
  await openApp(page);
  await trySample(page);
  const firstFlaky = page.locator('.ranked-row', { has: page.locator('[data-pill]', { hasText: 'Flaky' }) }).first();
  await expect(firstFlaky).toBeVisible();
  await expect(page.getByText('see evidence')).toHaveCount(0); // the row is the link
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

test('Try sample data is a quiet 14px link centered under the drop box, with a focus ring, also at phone width (DEV-48)', async ({ page }) => {
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 800 });
    await openApp(page);
    const box = await page.getByRole('region', { name: 'Import reports' }).boundingBox();
    const link = page.getByRole('button', { name: 'Try sample data' });
    const at = await link.boundingBox();
    expect(at!.y).toBeGreaterThan(box!.y + box!.height - 1); // under the box
    expect(at!.height).toBeGreaterThanOrEqual(24);
    expect(Math.abs(at!.x + at!.width / 2 - (box!.x + box!.width / 2))).toBeLessThan(2); // centered on the box
    const style = await link.evaluate((el) => {
      const s = getComputedStyle(el);
      return { size: s.fontSize, deco: s.textDecorationLine, offset: s.textUnderlineOffset, color: s.color, bg: s.backgroundColor, border: s.borderTopWidth, link: getComputedStyle(document.documentElement).getPropertyValue('--link').trim() };
    });
    expect(style).toMatchObject({ size: '14px', deco: 'underline', offset: '2px', bg: 'rgba(0, 0, 0, 0)', border: '0px' });
    await page.getByRole('button', { name: 'Browse files' }).focus();
    await page.keyboard.press('Tab');
    await expect(link).toBeFocused();
    const ring = await link.evaluate((el) => getComputedStyle(el).outlineStyle + ' ' + getComputedStyle(el).outlineWidth);
    expect(ring).not.toMatch(/^none/); // a visible focus ring
    expect(await page.getByRole('button').count()).toBeGreaterThanOrEqual(2); // Browse files and the link (a button element that looks like a link)
  }
});
