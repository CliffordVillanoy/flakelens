import { it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { loadLab } from '../scripts/eval-lab';
import { scoreTests } from '../src/engine/score/score';
import { labelKey, readLabels } from './labels';

// DEV-34: the lab reports carry realistic, simulated durations, and nothing else about the lab changed.
// DEV-35: the same checks hold with the new cause tests added.
const manifest = JSON.parse(readFileSync('fixtures/lab/manifest.json', 'utf8')) as { file: string; commit: string }[];
const labels = readLabels();
const baseline = JSON.parse(readFileSync('flake-lab/patterns.json', 'utf8')) as Record<string, Record<string, string[]>>;

type Result = { status?: string; duration: number };
type Suite = { suites?: Suite[]; specs?: { title: string; tests: { projectName: string; results: Result[] }[] }[] };
// keyed like labels.json: "title", or "title [project]" outside the default project
function attempts(file: string): Record<string, Result[]> {
  const out: Record<string, Result[]> = {};
  const walk = (s: Suite) => {
    for (const sp of s.specs ?? []) for (const t of sp.tests) out[labelKey(sp.title, t.projectName)] = t.results;
    (s.suites ?? []).forEach(walk);
  };
  (JSON.parse(readFileSync(file, 'utf8')) as Suite).suites?.forEach(walk);
  return out;
}

it('every pass and fail pattern of the nine original tests is the one recorded before the durations were added (DEV-08 style)', () => {
  expect(manifest).toHaveLength(12);
  for (const { file } of manifest) {
    const now = attempts(`fixtures/lab/${file}`);
    for (const [title, expected] of Object.entries(baseline[file]!)) expect(now[title]?.map((r) => r.status), `${file} ${title}`).toEqual(expected);
  }
});

it('stable tests take 0.5 to 3 s; flaky, failing and unproven attempts take 3 to 40 s', () => {
  for (const { file } of manifest) {
    for (const [key, results] of Object.entries(attempts(`fixtures/lab/${file}`))) {
      for (const r of results) {
        if (labels[key]!.label === 'stable' || labels[key]!.label === 'insufficient') {
          expect(r.duration, `${file} ${key}`).toBeGreaterThanOrEqual(500);
          expect(r.duration, `${file} ${key}`).toBeLessThanOrEqual(3_000);
        } else {
          expect(r.duration, `${file} ${key}`).toBeGreaterThanOrEqual(3_000);
          expect(r.duration, `${file} ${key}`).toBeLessThanOrEqual(40_000);
        }
      }
    }
  }
});

it('the engine finds at least 1 minute for the top Flaky test and at least 10 minutes of Flaky wasted time', () => {
  const ds = loadLab(manifest, 'fixtures/lab');
  const flaky = scoreTests(ds).filter((s) => s.label === 'flaky');
  expect(flaky.length).toBeGreaterThanOrEqual(9);
  expect(Math.max(...flaky.map((s) => s.wastedMs))).toBeGreaterThanOrEqual(60_000);
  expect(flaky.reduce((n, s) => n + s.wastedMs, 0)).toBeGreaterThanOrEqual(600_000);
});

it('the sample is the same 12 reports, and the sample folder stays under 1 MB', () => {
  for (const { file } of manifest) expect(readFileSync(`public/sample/${file}`, 'utf8'), file).toBe(readFileSync(`fixtures/lab/${file}`, 'utf8'));
  const bytes = readdirSync('public/sample').reduce((n, f) => n + statSync(`public/sample/${f}`).size, 0);
  expect(bytes).toBeLessThan(1_000_000);
});

it('the sample keeps a 5 % margin under 1 MB: code-frame snippets are trimmed from the reports', () => {
  const bytes = readdirSync('public/sample').reduce((n, f) => n + statSync(`public/sample/${f}`).size, 0);
  expect(bytes).toBeLessThan(950_000);
  for (const { file } of manifest) expect(readFileSync(`fixtures/lab/${file}`, 'utf8'), file).not.toContain('"snippet"');
});

it('the README says the durations are simulated and lists the ranges', () => {
  const text = readFileSync('flake-lab/README.md', 'utf8');
  expect(text).toMatch(/simulated/i);
  expect(text).toContain('0.5 to 3 s');
  expect(text).toContain('3 to 40 s');
  expect(text).toContain('5 to 30 s');
});
