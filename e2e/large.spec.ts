import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

// 5,000 tests x 50 runs (one file per run, 250,000 results). Generated on first use into a git-ignored folder.
const DIR = path.resolve('e2e/fixtures/large');
const TESTS = 5000;
const RUNS = 50;

function makeFixtures() {
  mkdirSync(DIR, { recursive: true });
  for (let r = 0; r < RUNS; r++) {
    const file = path.join(DIR, `run-${String(r).padStart(2, '0')}.json`);
    if (existsSync(file)) continue;
    const specs = Array.from({ length: TESTS }, (_, i) => {
      const fail = (i + r) % 7 === 0;
      const results = fail && i % 3 === 0 ? [{ status: 'failed', retry: 0, duration: 120 }, { status: 'passed', retry: 1, duration: 110 }] : [{ status: fail ? 'failed' : 'passed', retry: 0, duration: 100 + (i % 50) }];
      return { title: `test ${i}`, file: `suite${i % 40}.spec.ts`, tests: [{ projectName: 'chromium', results }] };
    });
    const startTime = new Date(Date.UTC(2026, 10, 1, 0, r)).toISOString();
    writeFileSync(file, JSON.stringify({ config: {}, stats: { startTime }, suites: [{ title: 'big.spec.ts', file: 'big.spec.ts', specs }] }));
  }
  return Array.from({ length: RUNS }, (_, r) => path.join(DIR, `run-${String(r).padStart(2, '0')}.json`));
}

test('5,000 tests x 50 runs: the page stays responsive while importing and renders only the visible rows', async ({ page }) => {
  test.setTimeout(240_000);
  const files = makeFixtures();
  await openApp(page);
  // Watch the main thread: long tasks, and the longest gap between animation frames.
  await page.evaluate(() => {
    const w = window as unknown as { __long: number[]; __gap: number };
    w.__long = [];
    w.__gap = 0;
    new PerformanceObserver((list) => list.getEntries().forEach((e) => w.__long.push(e.duration))).observe({ entryTypes: ['longtask'] });
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      w.__gap = Math.max(w.__gap, now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const started = Date.now();
  await page.locator('input[type=file]').setInputFiles(files);
  await expect(page.getByText('Reading 50 files…')).toBeVisible(); // progress shows while the worker parses
  await expect(page).toHaveURL(/#\/tests$/, { timeout: 180_000 });
  await expect(page.locator('.ranked-row').first()).toBeVisible();
  const importMs = Date.now() - started;

  const stats = await page.evaluate(() => {
    const w = window as unknown as { __long: number[]; __gap: number };
    return { longest: Math.max(0, ...w.__long), tasks: w.__long.length, gap: w.__gap };
  });
  console.log(`large suite: import+render ${importMs} ms, longest task ${Math.round(stats.longest)} ms, ${stats.tasks} long tasks, longest frame gap ${Math.round(stats.gap)} ms`);
  test.info().annotations.push({ type: 'large-suite', description: JSON.stringify({ importMs, ...stats }) });
  // A task of 2 s or more would freeze typing and clicks; the parse itself runs in the worker.
  expect(stats.longest).toBeLessThan(2000);

  // Virtual rows: only what is visible is in the page, whatever the total.
  const rendered = () => page.locator('.ranked-row').count();
  await page.evaluate(() => (window.location.hash = '#/tests?status=unproven'));
  await expect(page.getByText(/^Showing .* 5,?000 tests|^Showing .*\d+ Stable tests/)).toBeVisible();
  expect(await rendered()).toBeGreaterThan(5);
  expect(await rendered()).toBeLessThan(150);
  const scroller = page.locator('#results');
  const total = await scroller.evaluate((el) => el.scrollHeight);
  expect(total).toBeGreaterThan(20_000); // thousands of rows' worth of height, not thousands of nodes
  const scrollStarted = Date.now();
  for (const fraction of [0.25, 0.5, 0.75, 1]) {
    await scroller.evaluate((el, f) => (el.scrollTop = el.scrollHeight * f), fraction);
    await expect.poll(rendered).toBeGreaterThan(3);
    expect(await rendered()).toBeLessThan(150);
  }
  console.log(`large suite: four scroll jumps in ${Date.now() - scrollStarted} ms`);

  // Search stays quick.
  const typed = Date.now();
  await page.evaluate(() => (window.location.hash = '#/tests'));
  await page.getByRole('searchbox').fill('test 4999');
  await expect(page.getByText(/^Showing 1 test matching "test 4999"/)).toBeVisible();
  console.log(`large suite: search result in ${Date.now() - typed} ms`);
});
