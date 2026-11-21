import { test, expect } from '@playwright/test';
import { focusedText, importSampleFilesAsOwn, openApp } from './helpers';

// Real key presses only (a synthetic Escape on the window does not close a native dialog).

test('keyboard only: from Start through sample data to an open test, and back', async ({ page }) => {
  await openApp(page);
  for (let i = 0; i < 12 && (await focusedText(page)) !== 'Try sample data'; i++) await page.keyboard.press('Tab');
  expect(await focusedText(page)).toBe('Try sample data');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/tests$/);
  await expect(page.locator('.ranked-row').first()).toBeVisible();

  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox')).toBeFocused();
  await page.keyboard.type('timing');
  await expect(page).toHaveURL(/q=timing/);
  await page.keyboard.press('Tab'); // out of the search box
  await page.keyboard.press('j');
  await expect(page.locator('.ranked-row a[data-test-id]').first()).toBeFocused();
  await page.keyboard.press('Enter');
  const title = page.locator('aside h2');
  await expect(title).toBeFocused();
  await expect(title).toHaveText('flaky: timing');

  await page.keyboard.press('Escape');
  await expect(page.locator('aside')).toHaveCount(0);
  await expect(page.locator('.ranked-row a[data-test-id]').first()).toBeFocused();

  await page.keyboard.press('?');
  const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('checkbox', { name: 'Single-key shortcuts' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(page.locator('.ranked-row a[data-test-id]').first()).toBeFocused();
});

test('j and k move through the tests in the panel, in the shown order', async ({ page }) => {
  await openApp(page);
  await importSampleFilesAsOwn(page);
  await page.locator('.ranked-row a[data-test-id]').first().click();
  const title = page.locator('aside h2');
  const first = await title.textContent();
  await page.keyboard.press('j');
  await expect(title).not.toHaveText(first!);
  await expect(page.getByText(/^2 of \d+ shown$/)).toBeVisible();
  await page.keyboard.press('k');
  await expect(title).toHaveText(first!);
  await expect(page.getByText(/^1 of \d+ shown$/)).toBeVisible();
});

test('"Skip to results" is the first stop and moves focus to the table', async ({ page }) => {
  await openApp(page);
  await importSampleFilesAsOwn(page);
  await page.reload();
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Skip to results' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#results')).toBeFocused();
});

test('single-key shortcuts are off when switched off, and never fire in the search box', async ({ page }) => {
  await openApp(page);
  await importSampleFilesAsOwn(page);
  await page.getByRole('searchbox').click();
  await page.keyboard.type('?jk');
  await expect(page.getByRole('searchbox')).toHaveValue('?jk');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Keyboard shortcuts and help' }).click();
  await page.getByRole('checkbox', { name: 'Single-key shortcuts' }).uncheck();
  await page.keyboard.press('Escape');
  await page.locator('body').click({ position: { x: 5, y: 300 } });
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox')).not.toBeFocused();
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('"?" is ignored while another dialog is open', async ({ page }) => {
  await openApp(page);
  await importSampleFilesAsOwn(page);
  await page.goto('./#/data');
  await page.getByRole('button', { name: 'Clear all data' }).click();
  await expect(page.getByRole('dialog', { name: 'Clear all data?' })).toBeVisible();
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
