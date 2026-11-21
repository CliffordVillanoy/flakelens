import { test, expect } from '@playwright/test';
import { addFiles, openApp, playwrightFixture as fx, sampleFile } from './helpers';

test('a valid and a partial file: banner counts, notices on Loaded data', async ({ page }) => {
  await openApp(page);
  await addFiles(page, [fx('valid-basic.json'), fx('partial-no-status.json')]);
  await expect(page).toHaveURL(/#\/tests$/);
  const banner = page.getByRole('status', { name: 'Import result' });
  await expect(banner).toContainText('1 result was not imported');
  await expect(banner).toContainText('1 result had no status: "adds item"');
  await banner.getByRole('link', { name: 'View all notices' }).click();
  await expect(page).toHaveURL(/#\/data$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Loaded data' })).toBeVisible();
  await expect(page.getByRole('region', { name: /^Notices/ })).toContainText('partial-no-status.json');
});

test('a failed file shows inline while the other files import', async ({ page }) => {
  await openApp(page);
  await addFiles(page, [fx('wrong-format.json'), fx('valid-basic.json'), fx('two-projects.json')]);
  await expect(page).toHaveURL(/#\/tests$/);
  await expect(page.getByRole('alert')).toContainText("wrong-format.json wasn't imported");
  await expect(page.getByText('2 other files imported. You can drop another file here.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Browse files' })).toBeEnabled();
});

test('only failed files: stays on Start and the drop zone stays active', async ({ page }) => {
  await openApp(page);
  await addFiles(page, [fx('empty.json'), fx('truncated.json')]);
  await expect(page.getByRole('alert')).toContainText("empty.json couldn't be read");
  await expect(page).not.toHaveURL(/#[/]tests/); // still on Start (no hash is added)
  await expect(page.getByRole('button', { name: 'Browse files' })).toBeEnabled();
  await addFiles(page, [fx('valid-basic.json')]); // and a later good file still works
  await expect(page).toHaveURL(/#\/tests$/);
});

test('reload keeps the data; Clear all data removes it and a reload stays on Start', async ({ page }) => {
  await openApp(page);
  await addFiles(page, [sampleFile('run-00.json'), sampleFile('run-01.json')]);
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/#\/tests$/);
  await expect(page.locator('.ranked-row').first()).toBeVisible();

  await page.goto('./#/data');
  await page.getByRole('button', { name: 'Clear all data' }).click();
  const dialog = page.getByRole('dialog', { name: 'Clear all data?' });
  await expect(dialog).toContainText('This deletes 2 files, 2 runs and all results from this browser.');
  await expect(dialog.getByRole('button', { name: 'Keep my data' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Clear all data' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Find your flaky tests' })).toBeVisible();
  await expect(page.getByText('All local data cleared')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Find your flaky tests' })).toBeVisible();
});

test('an old test link: Start with no data, the missing-test state with data', async ({ page }) => {
  await page.goto('./#/tests/some-old-id');
  await expect(page.getByRole('heading', { level: 1, name: 'Find your flaky tests' })).toBeVisible();
  await addFiles(page, [sampleFile('run-00.json')]);
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  await page.goto('./#/tests/some-old-id');
  await expect(page.getByRole('heading', { name: "This test isn't in the loaded data" })).toBeVisible();
  await page.getByRole('link', { name: 'Back to tests' }).click();
  await expect(page).toHaveURL(/#\/tests$/);
});

test('hostile test names render as text and run nothing', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  const evil = '<img src=x onerror=alert(1)> <script>alert(2)</script>';
  const report = {
    config: {},
    stats: { startTime: '2026-11-01T10:00:00.000Z' },
    suites: [
      {
        title: 'a.spec.ts',
        file: 'a.spec.ts',
        specs: [
          { title: evil, tests: [{ projectName: 'c', results: [{ status: 'failed', retry: 0, duration: 5 }, { status: 'passed', retry: 1, duration: 5 }] }] },
          { title: 'fine', tests: [{ projectName: 'c', results: [{ status: 'passed', retry: 0, duration: 5 }] }] },
        ],
      },
    ],
  };
  await openApp(page);
  await page.locator('input[type=file]').setInputFiles({ name: 'evil.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(report)) });
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  await expect(page.getByRole('link', { name: evil }).first()).toBeVisible();
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  expect(dialogs).toEqual([]);
});

test('storage blocked: the app still works for the session and warns, never a blank page', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  await openApp(page);
  await addFiles(page, [sampleFile('run-00.json')]);
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  await expect(page.getByText("This browser won't keep your data after you close the tab.")).toBeVisible();
});
