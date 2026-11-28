import path from 'node:path';
import { test, expect } from '@playwright/test';
import { addFiles, ORIGIN, openApp } from './helpers';

const junit = (f: string) => path.resolve('fixtures/junit', f);

test('Start: a Surefire file with reruns imports, shows its flaky test, and the help mentions JUnit', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText('Using JUnit XML? Drop the XML files the same way.')).toBeVisible();
  await addFiles(page, [junit('surefire-rerun.xml'), junit('valid.xml')]);
  await expect(page).toHaveURL(/#\/tests$/);
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'passesAfterRetry' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'alwaysFails' })).toBeVisible();
  await page.getByRole('link', { name: 'passesAfterRetry' }).click();
  await expect(page.locator('aside h2')).toHaveText('passesAfterRetry');
  await expect(page.locator('aside')).toContainText('com.acme.FlakyTest');
});

test('Loaded data: a JUnit file dropped there is added next to the first', async ({ page }) => {
  await openApp(page);
  await addFiles(page, [junit('valid.xml')]);
  await expect(page).toHaveURL(/#\/tests$/);
  await page.evaluate(() => (window.location.hash = '#/data'));
  await expect(page.getByRole('heading', { level: 1, name: 'Loaded data' })).toBeVisible();
  await addFiles(page, [junit('surefire-rerun.xml')]);
  await expect(page.getByText('surefire-rerun.xml')).toBeVisible();
  await expect(page.getByText('valid.xml')).toBeVisible();
  await expect(page.getByRole('main')).toContainText('2 runs');
});

test('hostile and unsafe XML: text stays text, entities are refused, nothing is requested', async ({ page, context }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  context.on('request', (r) => requests.push(r.url()));
  await openApp(page);
  await addFiles(page, [junit('xxe-file.xml'), junit('xxe-http.xml'), junit('billion-laughs.xml'), junit('wrong-format.xml'), junit('truncated.xml'), junit('empty.xml')]);
  await expect(page.getByRole('alert').first()).toBeVisible();
  const text = await page.locator('main').innerText();
  expect(text).toContain("xxe-file.xml wasn't imported.");
  expect(text.match(/It defines XML entities, which FlakeLens never reads./g)).toHaveLength(3); // both XXE files and the billion laughs
  expect(text).toContain("It isn't a Playwright JSON or JUnit XML report.");
  expect(text).toContain("truncated.xml couldn't be read.");
  expect(text).not.toContain('root:');
  await expect(page.getByRole('heading', { level: 1, name: 'Find your flaky tests' })).toBeVisible(); // no file imported, so Start stays

  await addFiles(page, [junit('hostile.xml')]);
  await expect(page).toHaveURL(/#\/tests$/);
  await page.evaluate(() => (window.location.hash = '#/tests?q=onerror')); // a search opens the groups
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  await expect(page.locator('.ranked-row').first()).toContainText('<img src=x onerror=alert(1)>'); // drawn as text
  expect(await page.evaluate(() => document.querySelectorAll('main img, main script').length)).toBe(0); // nothing from the file became markup
  expect(await page.evaluate(() => document.body.innerHTML.includes('FAKE-TOKEN'))).toBe(false);

  const outside = requests.filter((u) => /^https?:/.test(u)).filter((u) => new URL(u).origin !== ORIGIN);
  expect(outside, outside.join('\n')).toEqual([]);
  expect(requests.some((u) => u.includes('127.0.0.1:9'))).toBe(false);
});
