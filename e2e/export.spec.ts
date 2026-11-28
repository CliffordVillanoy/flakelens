import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { addFiles, importSampleFilesAsOwn, openApp, trySample } from './helpers';

const FAKE = 'FAKE-TOKEN-NOT-A-SECRET-000000';

async function download(page: Page, click: () => Promise<void>) {
  const [d] = await Promise.all([page.waitForEvent('download'), click()]);
  const file = await d.path();
  return { name: d.suggestedFilename(), body: readFileSync(file, 'utf8') };
}
const exportMenu = async (page: Page) => {
  await page.getByRole('button', { name: 'Export' }).click();
  return page.getByRole('menu', { name: 'Export' });
};

test('sample data: CSV and JSON download with fixed names, say "sample data" inside, and the toast names the file', async ({ page }) => {
  await openApp(page);
  await trySample(page);
  const rows = await page.locator('.ranked-row').count();
  expect(rows).toBeGreaterThan(0);

  let menu = await exportMenu(page);
  const csv = await download(page, () => menu.getByRole('menuitem', { name: 'Download CSV' }).click());
  expect(csv.name).toBe('flakelens-tests.csv');
  expect(csv.body.charCodeAt(0)).toBe(0xfeff);
  const lines = csv.body.slice(1).split('\r\n');
  expect(lines[0]).toBe('rank,test,file,project,status,score,mixed commits,flip rate,attempts,wasted minutes,evidence,first seen,last failed,data');
  expect(lines.length).toBeGreaterThan(5);
  for (const l of lines.slice(1)) expect(l.endsWith(',sample data')).toBe(true);
  await expect(page.getByText(/^Downloaded flakelens-tests\.csv\. \d+ tests?\.$/)).toBeVisible();

  menu = await exportMenu(page);
  const json = await download(page, () => menu.getByRole('menuitem', { name: 'Download JSON' }).click());
  expect(json.name).toBe('flakelens-tests.json');
  const data = JSON.parse(json.body);
  expect(data).toMatchObject({ app: 'FlakeLens', scope: 'view', sample: true });
  expect(data.tests).toHaveLength(lines.length - 1);
  expect(typeof data.version).toBe('string');
  expect(() => new Date(data.exportedAt).toISOString()).not.toThrow();
});

test('the scope decides what is written: Current view follows the filter, All tests ignores it', async ({ page }) => {
  await openApp(page);
  await importSampleFilesAsOwn(page);
  await page.evaluate(() => (window.location.hash = '#/tests?status=flaky'));
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  const flaky = await page.locator('.ranked-row').count();

  let menu = await exportMenu(page);
  const view = await download(page, () => menu.getByRole('menuitem', { name: 'Download CSV' }).click());
  expect(view.body.slice(1).split('\r\n')).toHaveLength(1 + flaky);
  expect(view.body).not.toContain('sample data'); // own data

  menu = await exportMenu(page);
  await menu.getByRole('menuitemradio', { name: /^All tests/ }).click();
  const all = await download(page, () => menu.getByRole('menuitem', { name: 'Download CSV' }).click());
  expect(all.body.slice(1).split('\r\n').length).toBeGreaterThan(1 + flaky);
});

test('hostile names are safe in every file: a formula, a newline, commas and quotes, and a token never reach the files', async ({ page }) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'flakelens-'));
  const report = (start: string, status: string) => ({
    config: {},
    stats: { startTime: start },
    suites: [
      {
        title: 'x.spec.ts',
        file: 'x.spec.ts',
        specs: [
          { title: '=HYPERLINK("http://x","y")\n2, "q"', file: 'x.spec.ts', tests: [{ projectName: 'chromium', results: [{ status: 'failed', retry: 0, duration: 100, error: { message: `Bearer ${FAKE}` } }, { status, retry: 1, duration: 100 }] }] },
          { title: `login token=${FAKE}`, file: 'x.spec.ts', tests: [{ projectName: 'chromium', results: [{ status: 'passed', retry: 0, duration: 100 }] }] },
        ],
      },
    ],
  });
  const a = path.join(dir, 'a.json');
  const b = path.join(dir, 'b.json');
  writeFileSync(a, JSON.stringify(report('2026-11-20T10:00:00.000Z', 'passed')));
  writeFileSync(b, JSON.stringify(report('2026-11-21T10:00:00.000Z', 'failed')));
  await openApp(page);
  await addFiles(page, [a, b]);
  await expect(page.getByRole('heading', { level: 1, name: 'Tests ranked by fix priority' })).toBeVisible();

  const menu = await exportMenu(page);
  const csv = await download(page, () => menu.getByRole('menuitem', { name: 'Download CSV' }).click());
  expect(csv.body).toContain(`"'=HYPERLINK(""http://x"",""y"") 2, ""q"""`);
  expect(csv.body.slice(1).split('\r\n')).toHaveLength(3); // the newline in a name did not add a row
  expect(csv.body).not.toContain('FAKE-TOKEN');
  const m2 = await exportMenu(page);
  const json = await download(page, () => m2.getByRole('menuitem', { name: 'Download JSON' }).click());
  expect(json.body).not.toContain('FAKE-TOKEN');
  expect(await page.evaluate(() => document.body.innerHTML.includes('FAKE-TOKEN'))).toBe(false);
});

test('Open report: the preview, the Markdown view, and the .md file say the same; sample data says so inside', async ({ page }) => {
  await openApp(page);
  await trySample(page);
  const menu = await exportMenu(page);
  await menu.getByRole('menuitem', { name: 'Open report' }).click();
  await expect(page).toHaveURL(/#\/report\?scope=view$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Report' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'This report uses sample data.' })).toBeVisible();
  const preview = page.getByRole('article', { name: 'FlakeLens report' });
  await expect(preview).toContainText('Top Flaky tests');

  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  const shown = await page.getByTestId('report-markdown').innerText();
  const file = await download(page, () => page.getByRole('button', { name: 'Download .md' }).click());
  expect(file.name).toBe('flakelens-report.md');
  expect(file.body.trimEnd()).toBe(shown.trimEnd());
  expect(file.body).toMatch(/^# FlakeLens report\n/);
  expect(file.body).toContain('This report uses sample data. It says so inside the file.');
  expect(file.body).toContain('## Summary');
  expect(file.body).toContain('## Top Flaky tests');
  expect(file.body).toContain('Generated by FlakeLens');

  await page.getByRole('link', { name: 'Back to tests' }).click();
  await expect(page).toHaveURL(/#\/tests$/);
});

test('the report page with nothing loaded says so and offers Add your files', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => (window.location.hash = '#/report'));
  await expect(page.getByText('No results to report yet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add your files' })).toBeVisible();
});

test('5,000 tests export from the menu quickly', async ({ page }) => {
  test.setTimeout(120_000);
  const dir = mkdtempSync(path.join(os.tmpdir(), 'flakelens-'));
  const specs = Array.from({ length: 5000 }, (_, i) => ({
    title: `test ${i}`,
    file: `suite${i % 40}.spec.ts`,
    tests: [{ projectName: 'chromium', results: i % 7 === 0 ? [{ status: 'failed', retry: 0, duration: 100 }, { status: 'passed', retry: 1, duration: 100 }] : [{ status: 'passed', retry: 0, duration: 100 }] }],
  }));
  const f1 = path.join(dir, 'a.json');
  const f2 = path.join(dir, 'b.json');
  writeFileSync(f1, JSON.stringify({ config: {}, stats: { startTime: '2026-11-20T10:00:00.000Z' }, suites: [{ title: 'big.spec.ts', file: 'big.spec.ts', specs }] }));
  writeFileSync(f2, JSON.stringify({ config: {}, stats: { startTime: '2026-11-21T10:00:00.000Z' }, suites: [{ title: 'big.spec.ts', file: 'big.spec.ts', specs }] }));
  await openApp(page);
  await addFiles(page, [f1, f2]);
  await expect(page.getByRole('heading', { level: 1, name: 'Tests ranked by fix priority' })).toBeVisible({ timeout: 90_000 });
  const menu = await exportMenu(page);
  await menu.getByRole('menuitemradio', { name: /^All tests/ }).click();
  const t0 = Date.now();
  const csv = await download(page, () => menu.getByRole('menuitem', { name: 'Download CSV' }).click());
  expect(Date.now() - t0).toBeLessThan(5000);
  expect(csv.body.slice(1).split('\r\n')).toHaveLength(5001);
});
