import { test, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { labMs } from '../prng';

// DEV-35, for DEV-40: the same test runs in two Playwright projects (desktop chromium and chromium-mobile, a phone viewport).
// On the phone the navigation is behind the Menu button, so the Cart link is hidden and the check times out after 5 s.
// The desktop run always passes. The phone run always fails.
const run = Number(process.env.LAB_RUN ?? 0);
const appUrl = pathToFileURL(fileURLToPath(new URL('../app/index.html', import.meta.url))).href;

test('responsive: menu button', async ({ page }, info) => {
  const slow = labMs(run, info.title, info.retry, 400, 2000);
  await page.goto(`${appUrl}?slow=${slow}`);
  await expect(page.locator('#status')).toHaveText('Ready', { timeout: slow + 10_000 });
  await expect(page.getByRole('link', { name: 'Cart' })).toBeVisible({ timeout: 5000 });
});
