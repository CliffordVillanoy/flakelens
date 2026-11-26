import { mkdirSync, writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';
import { importSampleFilesAsOwn, openApp, type Theme } from './helpers';

// Axe on every screen and state, in both themes. Serious and critical violations fail the test; every finding
// (including moderate and minor) is written to e2e/screenshots/axe/<theme>-<screen>.json for the report.
const OUT = 'e2e/screenshots';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function scan(page: Page, theme: Theme, screen: string) {
  mkdirSync(`${OUT}/axe`, { recursive: true });
  await page.screenshot({ path: `${OUT}/${theme}-${screen}.png`, fullPage: true });
  const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const violations = result.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
    // Contrast checks carry the colours and the ratio; keep them so token problems can be reported exactly.
    details: v.nodes.slice(0, 6).map((n) => ({
      target: n.target.join(' '),
      html: n.html.slice(0, 120),
      data: n.any.map((c) => c.data).filter(Boolean),
    })),
  }));
  writeFileSync(`${OUT}/axe/${theme}-${screen}.json`, JSON.stringify({ theme, screen, violations }, null, 2));
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking, `${theme} ${screen}: ${JSON.stringify(blocking.map((v) => [v.id, v.nodes, v.details[0]?.data]))}`).toEqual([]);
}

for (const theme of ['dark', 'light'] as const) {
  test.describe(`axe, ${theme} theme`, () => {
    test('Start and an inline import failure', async ({ page }) => {
      await openApp(page, theme);
      await scan(page, theme, '01-start');
      await page.locator('input[type=file]').setInputFiles('fixtures/playwright/wrong-format.json');
      await expect(page.getByRole('alert')).toBeVisible();
      await scan(page, theme, '02-start-failed-file');
    });

    test('Tests, controls, panel, edge states and the sample banner', async ({ page }) => {
      await openApp(page, theme);
      await page.getByRole('button', { name: 'Try sample data' }).click();
      await expect(page.locator('.ranked-row').first()).toBeVisible();
      await scan(page, theme, '03-tests-sample');

      await page.evaluate(() => (window.location.hash = '#/data')); // memory only: a hash change keeps the sample
      await expect(page.getByRole('textbox', { name: 'Commit or label' }).first()).toHaveAttribute('readonly', '');
      await scan(page, theme, '19-commit-label-readonly');
      await page.evaluate(() => (window.location.hash = '#/tests'));
      await expect(page.locator('.ranked-row').first()).toBeVisible();

      await page.getByRole('button', { name: 'Columns' }).click();
      await scan(page, theme, '04-tests-columns-open');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Export' }).click();
      await scan(page, theme, '05-tests-export-open');
      await page.keyboard.press('Escape');

      await page.locator('.ranked-row a[data-test-id]').first().click();
      await expect(page.locator('aside h2')).toBeFocused();
      await scan(page, theme, '06-test-panel');
      await page.keyboard.press('Escape');

      await page.goto('./#/tests/not-a-test'); // sample data is memory only: a hash change keeps it, a goto does not
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('Loaded data, dialogs and edge states with the user data', async ({ page }) => {
      await openApp(page, theme);
      await importSampleFilesAsOwn(page);
      await scan(page, theme, '07-tests-own-data');

      // A saved import that cannot be read: the skipped banner (with its action) and the Loaded data link.
      await page.evaluate(
        () =>
          new Promise<void>((resolve, reject) => {
            const open = indexedDB.open('flakelens');
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
              const tx = open.result.transaction('imports', 'readwrite');
              tx.objectStore('imports').add({ importId: 'corrupt', seq: 999, result: 'nope' });
              tx.oncomplete = () => (open.result.close(), resolve());
            };
          }),
      );
      await page.reload();
      await expect(page.getByText(/saved import couldn't be read/)).toBeVisible();
      await scan(page, theme, '16-skipped-banner');

      await page.evaluate(() => (window.location.hash = '#/tests?q=zzzz'));
      await expect(page.getByRole('heading', { name: 'No test matches "zzzz"' })).toBeVisible();
      await scan(page, theme, '08-edge-no-search-match');

      await page.evaluate(() => (window.location.hash = '#/tests?status=insufficient'));
      await expect(page.getByRole('heading', { name: /^No Not enough data tests/ })).toBeVisible();
      await scan(page, theme, '09-edge-empty-filter');

      await page.evaluate(() => (window.location.hash = '#/tests/not-a-test'));
      await expect(page.getByRole('heading', { name: "This test isn't in the loaded data" })).toBeVisible();
      await scan(page, theme, '10-edge-missing-test');

      await page.evaluate(() => (window.location.hash = '#/data'));
      await expect(page.getByRole('heading', { level: 1, name: 'Loaded data' })).toBeVisible();
      await scan(page, theme, '11-loaded-data');

      // Commit or label field: editing (counter, Save label, Cancel), then saved (status line, Remove label).
      const field = page.getByRole('textbox', { name: 'Commit or label' }).first();
      await field.fill('release-2026-11-25');
      await expect(page.getByRole('button', { name: 'Save label' }).first()).toBeVisible();
      await scan(page, theme, '17-commit-label-editing');
      await field.press('Enter');
      await expect(page.getByText('Label saved. Rankings updated.')).toBeVisible();
      await scan(page, theme, '18-commit-label-saved');

      await page.getByRole('main').getByRole('button', { name: 'Clear all data' }).click();
      await expect(page.getByRole('dialog', { name: 'Clear all data?' })).toBeVisible();
      await scan(page, theme, '12-dialog-clear-data');
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Keyboard shortcuts and help' }).click();
      await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
      await scan(page, theme, '13-dialog-shortcuts');
      await page.keyboard.press('Escape');
    });

    test('Leave-sample dialog and storage warning', async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(window, 'indexedDB', {
          get() {
            throw new DOMException('blocked', 'SecurityError');
          },
        });
      });
      await openApp(page, theme);
      await page.getByRole('button', { name: 'Try sample data' }).click();
      await expect(page.locator('.ranked-row').first()).toBeVisible();
      await page.locator('input[type=file]').setInputFiles('fixtures/playwright/valid-basic.json');
      await expect(page.getByRole('dialog', { name: 'Leave sample data?' })).toBeVisible();
      await scan(page, theme, '14-dialog-leave-sample');
      await page.getByRole('button', { name: 'Analyse my files' }).click();
      await expect(page.getByText("This browser won't keep your data")).toBeVisible();
      await scan(page, theme, '15-storage-off-warning');
    });
  });
}
