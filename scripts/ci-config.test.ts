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

it('grouped weekly PRs carry only minor and patch updates; majors come as single PRs', () => {
  const d = read('.github/dependabot.yml');
  for (const eco of ['npm', 'github-actions']) {
    const block = d.split(/^ {2}- package-ecosystem: /m).find((b) => b.startsWith(`"${eco}"`))!;
    expect(block, eco).toMatch(/patterns:\n\s+- "\*"\n\s+update-types:\n\s+- "minor"\n\s+- "patch"/);
    expect(block, eco).not.toMatch(/- "major"/);
  }
});

it('typescript major updates are ignored until typescript-eslint supports TypeScript 7, with the reason in a comment', () => {
  const d = read('.github/dependabot.yml');
  const npm = d.split(/^ {2}- package-ecosystem: /m).find((b) => b.startsWith('"npm"'))!;
  expect(npm).toMatch(/ignore:\n(?:\s+#.*\n)*\s+- dependency-name: "typescript"\n\s+update-types: \["version-update:semver-major"\]/);
  expect(d).toMatch(/#.*typescript-eslint/i);
  const actions = d.split(/^ {2}- package-ecosystem: /m).find((b) => b.startsWith('"github-actions"'))!;
  expect(actions).not.toMatch(/ignore:/);
});

it('only documented Dependabot v2 keys are used', () => {
  const d = read('.github/dependabot.yml');
  const allowed = new Set([
    'version', 'updates', 'package-ecosystem', 'directory', 'schedule', 'interval', 'open-pull-requests-limit',
    'commit-message', 'prefix', 'groups', 'patterns', 'update-types', 'ignore', 'dependency-name', 'npm', 'actions', // the last two are group names
  ]);
  const keys = [...d.matchAll(/^\s*(?:- )?([a-z-]+):/gim)].map((m) => m[1]!);
  expect(keys.filter((k) => !allowed.has(k))).toEqual([]);
});
