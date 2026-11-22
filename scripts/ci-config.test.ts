import { readFileSync, readdirSync } from 'node:fs';
import { it, expect } from 'vitest';

// Text checks on the GitHub config files (no YAML library: the files are small and the shapes are fixed).
const read = (f: string) => readFileSync(f, 'utf8');

it('Dependabot updates npm and github-actions weekly, grouped, with a small PR limit and a plain prefix', () => {
  const d = read('.github/dependabot.yml');
  expect(d).toMatch(/^version: 2$/m);
  for (const eco of ['npm', 'github-actions']) {
    const block = d.split(/^ {2}- package-ecosystem: /m).find((b) => b.startsWith(`"${eco}"`));
    expect(block, eco).toBeDefined();
    expect(block).toMatch(/directory: "\/"/);
    expect(block).toMatch(/interval: "weekly"/);
    expect(block).toMatch(/groups:\n\s+\S+:\n\s+patterns:\n\s+- "\*"/);
    expect(block).toMatch(/open-pull-requests-limit: [1-5]\b/);
    expect(block).toMatch(/prefix: "chore\(deps\)"/);
  }
  expect(d).not.toMatch(/claude/i);
});

it('the CI check job audits runtime dependencies right after npm ci', () => {
  const ci = read('.github/workflows/ci.yml');
  const check = ci.slice(ci.indexOf('\n  check:'), ci.indexOf('\n  e2e:'));
  const steps = [...check.matchAll(/- run: (.+)/g)].map((m) => m[1]);
  expect(steps.slice(0, 2)).toEqual(['npm ci', 'npm audit --omit=dev --audit-level=high']);
  expect(check).toMatch(/timeout-minutes: 10/);
});

it('cost rules stay: permissions, concurrency, path filters, and every action pinned to a commit SHA', () => {
  for (const f of readdirSync('.github/workflows')) {
    const w = read(`.github/workflows/${f}`);
    expect(w, f).toMatch(/^permissions:\n {2}contents: read/m);
    for (const m of w.matchAll(/uses: (\S+)/g)) expect(m[1], `${f}: ${m[1]}`).toMatch(/@[0-9a-f]{40}$/);
  }
  const ci = read('.github/workflows/ci.yml');
  expect(ci).toMatch(/concurrency:\n {2}group: ci-/);
  expect(ci).toContain("- '!docs/**'");
});
