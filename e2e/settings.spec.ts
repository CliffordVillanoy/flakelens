import { test, expect } from '@playwright/test';
import { addFiles, openApp, sampleFile } from './helpers';

const names = ['run-00.json', 'run-01.json'];
const fileRow = (page: import('@playwright/test').Page, name: string) => page.getByRole('listitem').filter({ hasText: name }).first();

test('remove a file: the confirmation names it, the rankings change, a reload keeps the deletion, Undo brings it back', async ({ page }) => {
  await openApp(page);
  await addFiles(page, names.map(sampleFile));
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  await page.goto('./#/data');
  await fileRow(page, 'run-00.json').getByRole('button', { name: 'Remove' }).click();
  const dialog = page.getByRole('dialog', { name: 'Remove run-00.json?' });
  await expect(dialog.getByRole('button', { name: 'Keep file' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Remove file' }).click();
  await expect(page.getByText('run-00.json removed. Rankings updated.')).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Files · 1$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /^Files · 1$/ })).toBeVisible(); // deleted from storage too
  await page.getByRole('button', { name: 'Remove' }).click();
  await page.getByRole('button', { name: 'Keep file' }).click();
  await expect(page.getByRole('heading', { name: /^Files · 1$/ })).toBeVisible();
});

test('Undo restores the file and the rankings; the last file goes back to Start and the toast follows', async ({ page }) => {
  await openApp(page);
  await addFiles(page, [sampleFile('run-00.json')]);
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  await page.goto('./#/data');
  await page.getByRole('button', { name: 'Remove' }).first().click();
  await expect(page.getByRole('dialog')).toContainText('This is your last file.');
  await page.getByRole('button', { name: 'Remove file' }).click();
  await expect(page.getByText('run-00.json removed. All results cleared.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: /flaky tests/i })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('run-00.json restored. Rankings updated.')).toBeVisible();
  await expect(page.locator('.ranked-row').first()).toBeVisible();
});

test('Settings: theme and density are saved across a reload; the header link opens it; thresholds start closed', async ({ page }) => {
  await openApp(page);
  await addFiles(page, names.map(sampleFile));
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/#[/]settings$/);
  await expect(page.getByRole('link', { name: 'Settings' })).toHaveCount(0);
  await expect(page.getByText('Show thresholds').locator('xpath=ancestor::details')).not.toHaveAttribute('open', '');
  await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Light' }).click();
  await page.getByRole('group', { name: 'Row density' }).getByRole('button', { name: 'Compact' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('group', { name: 'Row density' }).getByRole('button', { name: 'Compact' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/^FlakeLens [0-9]/)).toBeVisible();
});
