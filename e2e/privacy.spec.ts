import { test, expect } from '@playwright/test';
import { addFiles, ORIGIN, openApp, sampleFile, trySample } from './helpers';

test('in default mode every request stays on the app origin', async ({ page, context }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  context.on('request', (r) => requests.push(r.url()));
  let sockets = 0;
  page.on('websocket', () => sockets++);

  await openApp(page);
  await trySample(page);
  await page.locator('.ranked-row').first().getByRole('link').first().click();
  await expect(page.locator('aside h2')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Exit sample' }).click();
  await addFiles(page, [sampleFile('run-00.json'), sampleFile('run-bad.json')]);
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  await page.goto('./#/data');
  await expect(page.getByRole('heading', { level: 1, name: 'Loaded data' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear all data' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear all data' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Find your flaky tests' })).toBeVisible();

  const network = requests.filter((u) => /^https?:/.test(u)); // data: and blob: URLs never leave the browser
  expect(network.length).toBeGreaterThan(5); // the app files, fonts, sample files and the worker were requested
  const outside = network.filter((u) => new URL(u).origin !== ORIGIN);
  expect(outside, `requests outside ${ORIGIN}:\n${outside.join('\n')}`).toEqual([]);
  expect(network.some((u) => u.includes('/fonts/'))).toBe(true); // fonts come from the app itself
  expect(network.some((u) => /\/sample\/manifest\.json$/.test(u))).toBe(true);
  expect(sockets).toBe(0);
});

test('the page carries a strict Content Security Policy', async ({ page }) => {
  await openApp(page);
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("connect-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toMatch(/https?:/);
});
