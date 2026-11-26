import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadLab } from '../scripts/eval-lab';
import { scoreTests } from '../src/engine/score/score';
import { CAUSES, labelKey, readLabels } from './labels';

// DEV-35: one lab test per cause, with realistic failure text. The lab injects causes with seeded outcomes, so this checks
// the files the lab produced, not real mechanisms.
const manifest = JSON.parse(readFileSync('fixtures/lab/manifest.json', 'utf8')) as { file: string; commit: string }[];
const labels = readLabels();

type Err = { message?: string; stack?: string };
type Result = { status?: string; retry: number; duration: number; error?: Err; errors?: Err[]; stdout?: { text?: string }[] };
type Test = { projectName: string; results: Result[] };
type Suite = { suites?: Suite[]; specs?: { title: string; tests: Test[] }[] };
function specs(file: string): { title: string; tests: Test[] }[] {
  const out: { title: string; tests: Test[] }[] = [];
  const walk = (s: Suite) => {
    out.push(...(s.specs ?? []));
    (s.suites ?? []).forEach(walk);
  };
  (JSON.parse(readFileSync(file, 'utf8')) as Suite).suites?.forEach(walk);
  return out;
}
const all = manifest.flatMap(({ file }, run) =>
  specs(`fixtures/lab/${file}`).flatMap((s) => s.tests.map((t) => ({ run, file, title: s.title, project: t.projectName, results: t.results }))),
);
const ESC = String.fromCharCode(27);
const strip = (s: string) => s.split(ESC).map((part, i) => (i === 0 ? part : part.replace(/^\[[0-9;]*m/, ''))).join('');
const messages = (r: Result) => strip(r.error?.message ?? r.errors?.[0]?.message ?? '');

const NEW_FLAKY = ['flaky: order dependency', 'flaky: stale data', 'flaky: external call', 'flaky: low memory', 'flaky: lost update', 'flaky: strict locator'];
const INFRA = ['infra: login page', 'infra: search', 'infra: cart api', 'infra: profile', 'infra: checkout'];

it('every test has a label and a cause from the spec list (or null for a test that is not a flake)', () => {
  expect(Object.keys(labels).length).toBeGreaterThanOrEqual(21);
  for (const [key, e] of Object.entries(labels)) {
    expect(typeof e.label, key).toBe('string');
    expect(e.cause === null || (CAUSES as readonly string[]).includes(e.cause), key).toBe(true);
  }
  // the existing tests keep their labels
  expect(labels['flaky: timing']).toEqual({ label: 'flaky', cause: 'timing and waits' });
  expect(labels['flaky: random data']).toEqual({ label: 'flaky', cause: 'time and randomness' });
  expect(labels['stable: shows heading']!.label).toBe('stable');
  expect(labels['unproven: regression']!.label).toBe('suspect');
  expect(labels['new: added last run']!.label).toBe('insufficient');
});

it('all nine causes are covered by at least one test', () => {
  const covered = new Set(Object.values(labels).map((e) => e.cause));
  for (const c of CAUSES) expect(covered.has(c), c).toBe(true);
});

it('the lab tests found in the files are exactly the labelled ones, and the engine gives each its label', () => {
  const ds = loadLab(manifest, 'fixtures/lab');
  const found = new Set(ds.tests.map((t) => labelKey(t.title, t.project)));
  expect([...found].sort()).toEqual(Object.keys(labels).sort());
  const byId = new Map(ds.tests.map((t) => [t.testId, t]));
  const wrong = scoreTests(ds)
    .map((s) => ({ key: labelKey(byId.get(s.testId)!.title, byId.get(s.testId)!.project), got: s.label }))
    .filter((x) => x.got !== labels[x.key]!.label);
  expect(wrong).toEqual([]);
});

it('each new flaky test shows a mixed commit in the generated files', () => {
  const ds = loadLab(manifest, 'fixtures/lab');
  const byTitle = new Map(ds.tests.map((t) => [t.title, t.testId]));
  const scores = new Map(scoreTests(ds).map((s) => [s.testId, s]));
  for (const title of NEW_FLAKY) {
    expect(labels[title]!.label, title).toBe('flaky');
    expect(scores.get(byTitle.get(title)!)!.mixedCommits, title).toBeGreaterThanOrEqual(1);
  }
});

it('each new flaky test fails with its realistic message', () => {
  const failed = (title: string) =>
    all.filter((x) => x.title === title).flatMap((x) => x.results.filter((r) => r.status === 'failed' || r.status === 'timedOut').map(messages));
  expect(failed('flaky: order dependency').some((m) => m.includes('expect(received).toBe(expected)') && m.includes('Expected: 0') && m.includes('Received: 1'))).toBe(true);
  expect(failed('flaky: stale data').some((m) => m.includes('expect(received).toBe(expected)') && m.includes('Expected: "Order #1001"') && m.includes('Received: "Order #1000"'))).toBe(true);
  expect(failed('flaky: external call').some((m) => m.includes('net::ERR_CONNECTION_REFUSED'))).toBe(true);
  expect(failed('flaky: external call').some((m) => m.includes('Expected: 200') && m.includes('Received: 503'))).toBe(true);
  expect(failed('flaky: low memory').some((m) => m.includes('ENOSPC: no space left on device'))).toBe(true);
  expect(failed('flaky: lost update').some((m) => m.includes('Expected: "Total: 12"') && m.includes('Received: "Total: 11"'))).toBe(true);
  expect(failed('flaky: strict locator').some((m) => m.includes('strict mode violation') && m.includes('resolved to 2 elements'))).toBe(true);
});

it('infrastructure event: in two runs at least 5 tests fail with the same normalised message and recover', () => {
  const norm = (m: string) => m.split('\n')[0]!.replace(/\d+/g, '<n>');
  const byRun = new Map<number, Map<string, string>>();
  for (const x of all.filter((t) => INFRA.includes(t.title))) {
    const bad = x.results.filter((r) => r.status === 'failed');
    if (bad.length === 0) continue;
    const m = byRun.get(x.run) ?? new Map<string, string>();
    m.set(x.title, norm(messages(bad[0]!)));
    byRun.set(x.run, m);
  }
  expect([...byRun.keys()]).toHaveLength(2);
  const runs = [...byRun.keys()].sort((a, b) => a - b);
  expect(runs[1]! - runs[0]!).toBe(1);
  for (const m of byRun.values()) {
    expect(m.size).toBeGreaterThanOrEqual(5);
    expect(new Set(m.values()).size).toBe(1);
    expect([...m.values()][0]).toContain('ECONNRESET');
  }
  // recover: every infra test passes in every other run, and a later run exists
  for (const title of INFRA) {
    for (const x of all.filter((t) => t.title === title && !runs.includes(t.run))) expect(x.results.at(-1)!.status, `${title} run ${x.run}`).toBe('passed');
    expect(Math.max(...all.filter((t) => t.title === title).map((t) => t.run))).toBeGreaterThan(runs[1]!);
  }
  for (const title of INFRA) expect(labels[title]).toEqual({ label: 'stable', cause: 'infrastructure' });
});

it('failures include multi-line stacks with project frames and library frames', () => {
  const stacks = all.flatMap((x) => x.results.map((r) => strip(r.error?.stack ?? r.errors?.[0]?.stack ?? ''))).filter(Boolean);
  expect(stacks.some((s) => s.split('\n').length >= 4)).toBe(true);
  expect(stacks.some((s) => /\/repo\/flake-lab\/(tests|lib)\//.test(s))).toBe(true); // project frames, path scrubbed to /repo
  expect(stacks.some((s) => /\/repo\/node_modules\/[\w@.-]+\//.test(s))).toBe(true); // library frames (Playwright and Node remove their own)
});

it('one log carries an obviously fake secret-like token (for redaction tests)', () => {
  const lines = all.flatMap((x) => x.results.flatMap((r) => (r.stdout ?? []).map((o) => o.text ?? '')));
  const hits = lines.filter((l) => /FAKE-TOKEN-NOT-A-SECRET/.test(l));
  expect(hits.length).toBeGreaterThan(0);
  expect(hits.every((l) => /Bearer FAKE-TOKEN-NOT-A-SECRET-0{6}/.test(l))).toBe(true);
});

it('one test fails in only one of two Playwright projects (DEV-40)', () => {
  const t = all.filter((x) => x.title === 'responsive: menu button');
  expect(new Set(t.map((x) => x.project))).toEqual(new Set(['chromium', 'chromium-mobile']));
  for (const x of t.filter((y) => y.project === 'chromium')) expect(x.results.at(-1)!.status).toBe('passed');
  for (const x of t.filter((y) => y.project === 'chromium-mobile')) expect(x.results.every((r) => r.status === 'failed' || r.status === 'timedOut')).toBe(true);
  expect(labels['responsive: menu button']).toEqual({ label: 'stable', cause: null });
  expect(labels['responsive: menu button [chromium-mobile]']).toEqual({ label: 'failing', cause: 'locator or UI' });
});

it('the README lists each message and says the causes are injected', () => {
  const text = readFileSync('flake-lab/README.md', 'utf8');
  for (const m of ['strict mode violation', 'net::ERR_CONNECTION_REFUSED', 'ECONNRESET', '503', 'ENOSPC', 'expect(received).toBe(expected)']) expect(text, m).toContain(m);
  expect(text).toMatch(/seeded outcomes/);
  expect(text).toMatch(/text rules, not real mechanisms/);
  for (const title of [...NEW_FLAKY, ...INFRA, 'responsive: menu button']) expect(text, title).toContain(title);
});
