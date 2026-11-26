import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readLabels } from '../flake-lab/labels';
import { buildReport, evaluateCauses, IDS } from './eval-causes';
import { loadLab } from './eval-lab';

const manifest = JSON.parse(readFileSync('fixtures/lab/manifest.json', 'utf8')) as { file: string; commit: string }[];
const ds = loadLab(manifest, 'fixtures/lab');
const result = evaluateCauses(ds, readLabels());

it('evaluates every lab test that fails and has an injected cause, once per project', () => {
  const withCause = Object.entries(readLabels()).filter(([, e]) => e.cause !== null);
  expect(result.tests.length).toBeGreaterThanOrEqual(15);
  expect(result.tests.length).toBeLessThanOrEqual(withCause.length);
  expect(new Set(result.tests.map((t) => t.title)).size).toBe(result.tests.length);
  for (const id of IDS) expect(result.tests.some((t) => t.truth === id), id).toBe(true); // all nine causes are in the test set
});

it('the report has the accuracy, the confusion matrix with an unknown column, the groups and the limits', () => {
  const md = buildReport(result);
  expect(md).toMatch(/## Accuracy\s+\*\*\d+ of \d+ tests/);
  expect(md).toMatch(/## Confusion matrix[\s\S]*\| unknown \|/);
  expect(md).toContain('counted as wrong');
  expect(md).toMatch(/## Failure groups/);
  expect(md).toMatch(/## Limits[\s\S]*synthetic[\s\S]*overfitting/);
  // matrix rows add up to the number of tests
  const rows = md.split('\n').filter((l) => /^\| (timing|order|sharedState|network|environment|concurrency|locator|time|infrastructure) \| \d+ \|/.test(l));
  expect(rows).toHaveLength(IDS.length);
  expect(rows.reduce((n, l) => n + Number(l.split('|')[2]), 0)).toBe(result.tests.length);
});

it('docs/eval/lab-causes.md is the generated report (nobody edited it by hand)', () => {
  expect(readFileSync('docs/eval/lab-causes.md', 'utf8')).toBe(buildReport(result));
});
