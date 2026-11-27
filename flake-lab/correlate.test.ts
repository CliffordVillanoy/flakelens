import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { correlate, correlateAll } from '../src/engine/correlate/correlate';
import { loadLab } from '../scripts/eval-lab';

// DEV-40 lab check. The 12 lab runs have one test (responsive: menu button) that fails on the phone viewport only
// (project chromium-mobile) and passes on desktop (project chromium). Both lab projects report the browser "chromium",
// so only the project dimension can tell them apart. A real report holds no OS, so nothing here depends on it.
const manifest = JSON.parse(readFileSync('fixtures/lab/manifest.json', 'utf8')) as { file: string; commit: string }[];
const ds = loadLab(manifest, 'fixtures/lab');
const byTitle = (title: string, project = 'chromium') => ds.tests.find((t) => t.title === title && t.project === project)!;
const get = (id: string, dimension: string) => correlate(ds, id).find((r) => r.dimension === dimension)!;

it('the test that fails only on the phone project is a Strong link to the project, from either side', () => {
  for (const project of ['chromium', 'chromium-mobile']) {
    const r = get(byTitle('responsive: menu button', project).testId, 'project');
    expect(r.status).toBe('finding');
    expect(r.strength).toBe('Strong');
    expect(r.highlightedValue).toBe('chromium-mobile');
    expect(r.pointsHigher).toBeGreaterThanOrEqual(90);
    expect(r.adjustedP).toBeLessThan(0.01);
  }
});

it('the browser cannot tell the lab projects apart: one value, so that dimension is missing', () => {
  const id = byTitle('responsive: menu button', 'chromium-mobile').testId;
  expect(get(id, 'browser').status).toBe('missing');
  expect(get(id, 'os').status).toBe('missing'); // no OS in a real report
  expect(get(id, 'shard').status).toBe('missing');
});

it('uniformly flaky tests are not flagged: no finding of any strength on a flaky test that runs in one project', () => {
  for (const title of ['flaky: timing', 'flaky: random data', 'flaky: cross-run only', 'flaky: order dependency', 'flaky: stale data', 'flaky: external call', 'flaky: low memory', 'flaky: lost update', 'flaky: strict locator']) {
    const t = byTitle(title);
    const out = correlate(ds, t.testId);
    expect(out.filter((r) => r.status === 'finding'), title).toEqual([]);
    expect(out.find((r) => r.dimension === 'project')!.status).toBe('missing');
  }
});

it('across the whole lab the only Strong findings belong to the two responsive tests', () => {
  const strong = [...correlateAll(ds)].filter(([, rs]) => rs.some((r) => r.strength === 'Strong')).map(([id]) => ds.tests.find((t) => t.testId === id)!.title);
  expect(strong).toEqual(['responsive: menu button', 'responsive: menu button']);
});
