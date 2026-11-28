import { readFileSync, readdirSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

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

// Upload and deploy in one job raced: deploy-pages looked for the artifact about 2 s after the upload and found none.
// A job boundary (as in GitHub's own Pages starter workflow) gives the artifact time to become visible.
describe('pages.yml: build and deploy are separate jobs', () => {
  const pages = read('.github/workflows/pages.yml');
  const job = (name: string) => {
    const start = pages.indexOf(`\n  ${name}:`);
    expect(start, name).toBeGreaterThan(-1);
    const rest = pages.slice(start + 1);
    const next = rest.slice(1).search(/\n {2}[a-z-]+:\n/);
    return next < 0 ? rest : rest.slice(0, next + 1);
  };

  it('has a build job and a deploy job that needs it', () => {
    expect(pages).toMatch(/^jobs:\n(?: {2}#.*\n)* {2}build:\n/m);
    expect(job('deploy')).toMatch(/^ {4}needs: build$/m);
  });

  it('build installs, builds and uploads the artifact, with read-only access', () => {
    const b = job('build');
    expect(b).toMatch(/- run: npm ci\n\s+- run: npm run build/);
    expect(b).toMatch(/actions\/upload-pages-artifact@/);
    expect(b).not.toMatch(/deploy-pages/);
    expect(b).not.toMatch(/pages: write|id-token: write/);
  });

  it('only deploy may write to Pages and request the token, and it uses the github-pages environment', () => {
    const d = job('deploy');
    expect(d).toMatch(/pages: write/);
    expect(d).toMatch(/id-token: write/);
    expect(d).toMatch(/environment:\n\s+name: github-pages\n\s+url: \$\{\{ steps\.deployment\.outputs\.page_url \}\}/);
    expect(d).toMatch(/actions\/deploy-pages@/);
    expect(d).not.toMatch(/upload-pages-artifact|npm ci|checkout/);
    expect(pages.match(/pages: write/g)).toHaveLength(1);
    expect(pages.match(/id-token: write/g)).toHaveLength(1);
  });

  it('keeps the triggers, path filters, concurrency and timeouts', () => {
    expect(pages).toMatch(/concurrency:\n {2}group: pages\n {2}cancel-in-progress: false/);
    expect(pages).toContain("- '!docs/**'");
    expect(pages).toContain("- 'docs/eval/**'");
    expect(pages).toMatch(/branches: \[main\]/);
    expect(pages).toMatch(/workflow_dispatch:/);
    expect(job('build')).toMatch(/timeout-minutes: 10/);
    expect(job('deploy')).toMatch(/timeout-minutes: 10/);
  });
});

// DEV-50: the e2e report is a public artifact, so the upload must stay behind the scrub and the verify step.
describe('ci.yml e2e report upload', () => {
  const ci = read('.github/workflows/ci.yml');
  const e2e = ci.slice(ci.indexOf('\n  e2e:'));
  const step = (id: string) => e2e.slice(e2e.indexOf(`- id: ${id}`)).split('\n      - ')[0] ?? '';

  it('scrubs, then verifies, then uploads only if the verify step passed', () => {
    expect(e2e.indexOf('scripts/scrub-report.ts')).toBeLessThan(e2e.indexOf('scripts/verify-report.ts'));
    expect(e2e.indexOf('scripts/verify-report.ts')).toBeLessThan(e2e.indexOf('actions/upload-artifact'));
    expect(e2e).toMatch(/if: always\(\) && steps\.verify\.outcome == 'success'\n\s+uses: actions\/upload-artifact@/);
    expect(step('verify')).toMatch(/steps\.scrub\.outcome == 'success'/);
    expect(step('verify')).not.toMatch(/continue-on-error/);
    expect(step('scrub')).not.toMatch(/continue-on-error/);
  });

  it('uploads nothing from fork pull requests and keeps the report 30 days', () => {
    expect(step('scrub')).toContain("github.event.pull_request.head.repo.full_name == github.repository");
    expect(step('scrub')).toContain("github.actor != 'dependabot[bot]'");
    expect(e2e).toMatch(/retention-days: 30\b/);
    expect(e2e.match(/upload-artifact/g)).toHaveLength(1);
  });

  it('no workflow uses pull_request_target or secrets', () => {
    for (const f of readdirSync('.github/workflows')) {
      const w = read(`.github/workflows/${f}`);
      expect(w, f).not.toMatch(/pull_request_target/);
      expect(w, f).not.toMatch(/secrets\./);
    }
  });
});
