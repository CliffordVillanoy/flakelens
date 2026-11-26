import { test, expect } from '@playwright/test';
import { openApp, trySample } from './helpers';

// DEV-28 item 8 (decisions 4 and 7): measured in a real browser.
const rowHeights = (page: import('@playwright/test').Page) =>
  page.locator('.ranked-row').evaluateAll((els) => els.slice(0, 8).map((e) => Math.round(e.getBoundingClientRect().height)));

test('Comfortable rows are at least 56px with the path on a second line; Compact rows are 32px, one line, path on hover only', async ({ page }) => {
  await openApp(page);
  await trySample(page);
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  // DESIGN.md: 56px is the minimum. With 12px cell padding the two text lines make rows 62 to 66px (measured).
  for (const h of await rowHeights(page)) expect(h).toBeGreaterThanOrEqual(56);
  const first = page.locator('.ranked-row').first();
  await expect(first.locator('.truncate.font-mono')).toHaveCount(1); // the path line

  await expect(page.getByRole('group', { name: 'Row density' })).toHaveCount(0); // the control lives on Settings only
  await page.evaluate(() => (window.location.hash = '#/settings'));
  await page.getByRole('group', { name: 'Row density' }).getByRole('button', { name: 'Compact' }).click();
  await page.evaluate(() => (window.location.hash = '#/tests'));
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  expect(new Set(await rowHeights(page))).toEqual(new Set([32]));
  await expect(page.locator('.ranked-row').first().locator('.truncate.font-mono')).toHaveCount(0);
  const title = await page.locator('.ranked-row a[data-test-id]').first().getAttribute('title');
  expect(title).toContain('.spec'); // the path is in the hover title
});

test('the test panel is 600px wide and its headings are weight 600', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await trySample(page);
  await page.locator('.ranked-row a[data-test-id]').first().click();
  const panel = page.locator('aside.test-panel');
  await expect(panel).toBeVisible();
  expect(Math.round((await panel.boundingBox())!.width)).toBe(600);
  const weights = await panel.locator('h2, h3').evaluateAll((els) => els.map((e) => getComputedStyle(e).fontWeight));
  expect(weights.length).toBeGreaterThan(0);
  expect([...new Set(weights)]).toEqual(['600']);
});

test('the header has no privacy line or lock, and the logo keeps the page gutter (24px desktop, 16px phone)', async ({ page }) => {
  await openApp(page);
  await trySample(page);
  await expect(page.getByText('Nothing leaves this browser')).toHaveCount(0);
  await expect(page.getByText('Local only')).toHaveCount(0);
  await expect(page.locator('header svg.lucide-lock')).toHaveCount(0);
  const logo = page.locator('header img');
  for (const [width, gutter] of [[1440, 24], [800, 24], [375, 16]] as const) {
    await page.setViewportSize({ width, height: 900 });
    const x = await logo.evaluate((e) => Math.round(e.getBoundingClientRect().left));
    expect(x, `logo left at ${width}px`).toBeGreaterThanOrEqual(gutter);
  }
});

// DEV-29 (docs/ux/12-simplification-pass.md): less text, checked in a real browser.
test('Tests: one-sentence sample banner, short health line, no legend row, group meaning as a tooltip', async ({ page }) => {
  await openApp(page);
  await trySample(page);
  await expect(page.getByText('Sample data. Start with the top 3 Flaky tests.')).toBeVisible();
  const box = page.getByRole('region', { name: 'Test health' });
  await expect(box.getByText(/^\d+ tests · \d+ runs$/)).toBeVisible();
  await expect(box).not.toContainText('commits');
  await expect(page.getByText(/oldest first/)).toHaveCount(0);
  const flaky = page.getByRole('rowheader').filter({ hasText: /^Flaky · \d+$/ }).locator('strong');
  await expect(flaky).toHaveAttribute('title', 'Different results on the same commit');
});

test('detail panel: a one-sentence note, two checks, the rest closed under "More to check"', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await trySample(page);
  await page.locator('.ranked-row a[data-test-id]').first().click();
  const note = page.getByRole('region', { name: 'What this means' });
  await expect(note).toContainText('This test gave different results on the same code.');
  const more = note.locator('details');
  await expect(more).not.toHaveAttribute('open', '');
  await expect(more.locator('summary')).toHaveText('More to check');
  await expect(note.getByText('Test order')).toBeHidden();
  await more.locator('summary').click();
  await expect(note.getByText('Test order')).toBeVisible();
  await expect(page.getByText(/Oldest on the left/)).toHaveCount(0);
});

test('Start and Loaded data say less', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText('A flaky test passes and fails on the same code. Drop your test reports to rank them.')).toBeVisible();
  await expect(page.getByText('More runs give better results.')).toBeVisible();
});

// DEV-29 criterion 7 (DESIGN.md "Row height decision", copy doc section 18): Comfortable rows are about 64px, two lines
// (name, path), and the Evidence cell is one line at every width (nowrap, ellipsis, full sentence in the tooltip).
const measure = (page: import('@playwright/test').Page) =>
  page.locator('.ranked-row').evaluateAll((rows) =>
    rows.slice(0, 12).map((row) => {
      const why = row.querySelector<HTMLElement>('.c-why')!;
      // The cell has 12px padding top and bottom and a 20px line: its content height tells the number of lines.
      const inner = why.getBoundingClientRect().height - 24;
      const text = why.querySelector<HTMLElement>('span')!;
      return {
        row: Math.round(row.getBoundingClientRect().height),
        whyLines: Math.round(inner / 20),
        cut: text.scrollWidth > text.clientWidth,
        titleIsText: text.getAttribute('title') === text.textContent,
        see: why.textContent!.includes('see evidence'),
      };
    }),
  );

for (const width of [1440, 1100]) {
  test(`at ${width}px Comfortable rows are about 64px and Evidence is one line`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openApp(page);
    await trySample(page);
    await expect(page.locator('.ranked-row').first()).toBeVisible();
    const rows = await measure(page);
    expect(rows.length).toBeGreaterThan(3);
    for (const r of rows) {
      expect(r.row, JSON.stringify(r)).toBeGreaterThanOrEqual(62);
      expect(r.row, JSON.stringify(r)).toBeLessThanOrEqual(66);
      expect(r.whyLines, JSON.stringify(r)).toBe(1);
      expect(r.titleIsText, JSON.stringify(r)).toBe(true); // nothing is lost when a line is cut
      expect(r.see).toBe(false);
    }
  });
}
