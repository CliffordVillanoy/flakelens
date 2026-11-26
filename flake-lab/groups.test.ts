import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG } from '../src/engine/config';
import { groupFailures } from '../src/engine/group/group';
import { loadLab } from '../scripts/eval-lab';

// DEV-36 lab check: the 21 lab tests of DEV-35 fail with 13 kinds of message once numbers, ports and paths are masked.
const manifest = JSON.parse(readFileSync('fixtures/lab/manifest.json', 'utf8')) as { file: string; commit: string }[];
const ds = loadLab(manifest, 'fixtures/lab');
const title = new Map(ds.tests.map((t) => [t.testId, `${t.title}${t.project === 'chromium-mobile' ? ' [chromium-mobile]' : ''}`]));
const groups = groupFailures(ds, DEFAULT_CONFIG);
const titlesOf = (g: (typeof groups)[number]) => [...new Set(g.testIds.map((id) => title.get(id)!))].sort();

it('the lab gives 13 failure groups (14 distinct injected messages; two are the same text once numbers are masked)', () => {
  expect(groups).toHaveLength(13);
  expect(groups.reduce((n, g) => n + g.count, 0)).toBe(ds.failures.length);
});

it('the infrastructure event is ONE group: 4 tests, 2 runs, the same ECONNRESET message although the port differs', () => {
  const infra = groups.filter((g) => titlesOf(g).some((t) => t.startsWith('infra:')));
  expect(infra).toHaveLength(1);
  const g = infra[0]!;
  expect(titlesOf(g)).toEqual(['infra: cart api', 'infra: login page', 'infra: profile', 'infra: search']);
  expect(g.runIds).toHaveLength(2);
  expect(g.count).toBe(16); // 4 tests x 2 runs x 2 attempts
  expect(g.template).toContain('apiRequestContext.get: socket hang up (ECONNRESET)');
  // 4 tests are under the starting threshold of 5, so this event is not flagged yet; at 4 it is
  expect(g.environmentEvent).toBe(false);
  expect(groupFailures(ds, { ...DEFAULT_CONFIG, envEventMinTests: 4 }).find((x) => x.fingerprint === g.fingerprint)!.environmentEvent).toBe(true);
});

it('the other injected causes have their own groups', () => {
  const kinds = groups.map(titlesOf);
  const alone = (t: string) => kinds.some((k) => k.length === 1 && k[0] === t);
  for (const t of [
    'flaky: timing',
    'flaky: random data',
    'flaky: cross-run only',
    'flaky: stale data',
    'flaky: low memory',
    'flaky: lost update',
    'flaky: strict locator',
    'failing: wrong heading',
    'unproven: regression',
    'responsive: menu button [chromium-mobile]',
  ])
    expect(alone(t), t).toBe(true);
  // the connection-refused failures of "external call" are separate from its 503 ones ...
  expect(kinds.some((k) => k.length === 1 && k[0] === 'flaky: external call')).toBe(true);
  // ... and the 503 ("Expected: 200 / Received: 503") reads as "Expected: <n> / Received: <n>", the same as the order dependency
  expect(kinds.some((k) => k.join('|') === 'flaky: external call|flaky: order dependency')).toBe(true);
});

it('no group is an environment event except by threshold, and no template holds the fake token', () => {
  expect(groups.filter((g) => g.environmentEvent)).toHaveLength(0);
  for (const g of groups) {
    expect(g.template).not.toContain('FAKE-TOKEN');
    expect(g.normalized).not.toContain('FAKE-TOKEN');
  }
});
