import path from 'node:path';
import { expect, type Page } from '@playwright/test';

export const ORIGIN = 'http://localhost:4173';
export const playwrightFixture = (f: string) => path.resolve('fixtures/playwright', f);
export const sampleFile = (f: string) => path.resolve('public/sample', f);
export const SAMPLE_FILES = ['run-00.json', 'run-01.json', 'run-02.json', 'run-03.json', 'run-04.json', 'run-05.json', 'run-bad.json'];

export type Theme = 'dark' | 'light';

/** Opens the app. The theme is saved in the same preference the theme button uses. */
export async function openApp(page: Page, theme?: Theme) {
  if (theme) await page.addInitScript((t) => window.localStorage.setItem('flakelens.theme', JSON.stringify(t)), theme);
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

export async function trySample(page: Page) {
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await expect(page).toHaveURL(/#\/tests$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Tests ranked by fix priority' })).toBeAttached();
}

/** Drops files through the (hidden) file input, the same path as Browse files. */
export async function addFiles(page: Page, files: string[]) {
  await page.locator('input[type=file]').setInputFiles(files);
}

export async function importSampleFilesAsOwn(page: Page) {
  await addFiles(page, SAMPLE_FILES.map(sampleFile));
  await expect(page).toHaveURL(/#\/tests$/);
  await expect(page.locator('.ranked-row').first()).toBeVisible();
}

export const focusedText = (page: Page) => page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
