import { test, expect } from '@playwright/test';
import { openApp, trySample } from './helpers';

// DEV-38: sample, Groups tab, open a card, open its test, see the cause tip.
test('Groups tab: the environment event first, a card with its cause, its test, and the cause tip in the panel', async ({ page }) => {
  await openApp(page);
  await trySample(page);
  await page.getByRole('navigation', { name: 'Views' }).getByRole('link', { name: /^Groups/ }).click();
  await expect(page).toHaveURL(/#[/]groups$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Failure groups' })).toBeVisible();

  // the lab's infrastructure event comes first, as one card
  const first = page.getByRole('listitem').first();
  await expect(first.getByRole('heading', { name: /^5 tests failed the same way in run / })).toBeVisible();
  await expect(first).toContainText('ECONNRESET');
  await expect(first).toContainText('Likely cause: Infrastructure');

  // a card with a high-confidence cause, its masked template and quoted evidence (the list is virtual: search brings it up)
  await page.getByRole('searchbox', { name: 'Search failure text' }).fill('ENOSPC');
  await expect(page).toHaveURL(/#[/]groups[?]q=ENOSPC$/);
  const card = page.getByRole('listitem').filter({ hasText: 'ENOSPC' }).first();
  await expect(card).toContainText('Likely cause: Environment or resources');
  await expect(card).toContainText('High confidence');
  await expect(card.locator('[data-evidence]')).toContainText('ENOSPC: no space left on device');

  // open its test: the panel adds the tip, and a link back to the group
  await card.getByRole('link', { name: 'flaky: low memory' }).click();
  await expect(page).toHaveURL(/#[/]tests[/]/);
  const panel = page.getByRole('complementary');
  await expect(panel.getByText('Likely cause: Environment or resources')).toBeVisible();
  await expect(panel.getByText('The machine probably ran short of memory, disk or CPU. Check the runner during the failing run.')).toBeVisible();
  await expect(panel.locator('[data-latest-failure] mark').first()).toBeVisible();
  await panel.getByRole('link', { name: /^See the group of \d+ failures$/ }).click();
  await expect(page).toHaveURL(/#[/]groups[?]g=/);
  await expect(page.locator('[data-group]:focus')).toContainText('ENOSPC');
});

test('Groups: search and sort live in the URL and survive a reload; no match offers Clear search', async ({ page }) => {
  await openApp(page);
  await trySample(page);
  await page.goto('./#/groups');
  await page.getByRole('searchbox', { name: 'Search failure text' }).fill('ECONNRESET');
  await expect(page).toHaveURL(/#[/]groups[?]q=ECONNRESET$/);
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Sort groups' }).selectOption('latest');
  await expect(page).toHaveURL(/q=ECONNRESET&sort=latest$/);
  await page.getByRole('searchbox', { name: 'Search failure text' }).fill('zzz-nothing');
  await expect(page.getByText('No groups match "zzz-nothing"')).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.getByRole('listitem').first()).toBeVisible();
  await expect(page).toHaveURL(/#[/]groups[?]sort=latest$/);
});
