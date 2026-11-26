import { it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { loadLab } from '../scripts/eval-lab';
import { scoreTests } from '../src/engine/score/score';

// DEV-34: the lab reports carry realistic, simulated durations, and nothing else about the lab changed.
const manifest = JSON.parse(readFileSync('fixtures/lab/manifest.json', 'utf8')) as { file: string; commit: string }[];
const labels = JSON.parse(readFileSync('flake-lab/labels.json', 'utf8')) as Record<string, string>;
const baseline = JSON.parse(readFileSync('flake-lab/patterns.json', 'utf8')) as Record<string, Record<string, string[]>>;

type Result = { status?: string; duration: number };
type Suite = { suites?: Suite[]; specs?: { title: string; tests: { results: Result[] }[] }[] };
function attempts(file: string): Record<string, Result[]> {
  const out: Record<string, Result[]> = {};
  const walk = (s: Suite) => {
    for (const sp of s.specs ?? []) out[sp.title] = sp.tests.flatMap((t) => t.results);
    (s.suites ?? []).forEach(walk);
  };
  (JSON.parse(readFileSync(file, 'utf8')) as Suite).suites?.forEach(walk);
  return out;
}

it('every pass and fail pattern of every run is the one recorded before the durations were added (DEV-08 style)', () => {
  expect(manifest).toHaveLength(12);
  for (const { file } of manifest) {
    const now = Object.fromEntries(Object.entries(attempts(`fixtures/lab/${file}`)).map(([k, v]) => [k, v.map((r) => r.status)]));
    expect(now, file).toEqual(baseline[file]);
  }
});

it('stable tests take 0.5 to 3 s; flaky, failing and unproven attempts take 3 to 40 s', () => {
  for (const { file } of manifest) {
    for (const [title, results] of Object.entries(attempts(`fixtures/lab/${file}`))) {
      for (const r of results) {
        if (labels[title] === 'stable' || labels[title] === 'insufficient') {
          expect(r.duration, `${file} ${title}`).toBeGreaterThanOrEqual(500);
          expect(r.duration, `${file} ${title}`).toBeLessThanOrEqual(3_000);
        } else {
          expect(r.duration, `${file} ${title}`).toBeGreaterThanOrEqual(3_000);
          expect(r.duration, `${file} ${title}`).toBeLessThanOrEqual(40_000);
        }
      }
    }
  }
});

it('the engine finds at least 1 minute for the top Flaky test and at least 10 minutes of Flaky wasted time', () => {
  const ds = loadLab(manifest, 'fixtures/lab');
  const flaky = scoreTests(ds).filter((s) => s.label === 'flaky');
  expect(flaky).toHaveLength(3);
  expect(Math.max(...flaky.map((s) => s.wastedMs))).toBeGreaterThanOrEqual(60_000);
  expect(flaky.reduce((n, s) => n + s.wastedMs, 0)).toBeGreaterThanOrEqual(600_000);
});

it('the sample is the same 12 reports, and the sample folder stays under 1 MB', () => {
  for (const { file } of manifest) expect(readFileSync(`public/sample/${file}`, 'utf8'), file).toBe(readFileSync(`fixtures/lab/${file}`, 'utf8'));
  const bytes = readdirSync('public/sample').reduce((n, f) => n + statSync(`public/sample/${f}`).size, 0);
  expect(bytes).toBeLessThan(1_000_000);
});

it('the README says the durations are simulated and lists the ranges', () => {
  const text = readFileSync('flake-lab/README.md', 'utf8');
  expect(text).toMatch(/simulated/i);
  expect(text).toContain('0.5 to 3 s');
  expect(text).toContain('3 to 40 s');
  expect(text).toContain('5 to 30 s');
});
