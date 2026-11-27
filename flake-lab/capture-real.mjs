// DEV-39: records real Playwright JSON reports of the lab into fixtures/playwright/real/ (run it with: node flake-lab/capture-real.mjs).
// Four small reports of one test that runs in both projects: no git info, git info, shard 1 of 2 and shard 2 of 2.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import console from 'node:console';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'fixtures', 'playwright', 'real');
const tmp = join(root, 'flake-lab', 'out');
mkdirSync(outDir, { recursive: true });
mkdirSync(tmp, { recursive: true });

// The reports hold absolute paths and the commit author; the files keep neither.
const scrub = (text) =>
  [JSON.stringify(root).slice(1, -1), root, root.replaceAll('\\', '/')]
    .reduce((t, p) => t.split(p).join('/repo'), text)
    .split(JSON.stringify(process.execPath).slice(1, -1))
    .join('node')
    .replace(/\/repo((?:\\\\[\w.@-]+)+)/g, (_, rest) => '/repo' + rest.replaceAll('\\\\', '/'));
const person = { name: 'Lab Author', email: 'lab@example.invalid' };
const tidyCommit = (c) => c && Object.assign(c, { body: c.subject, author: { ...c.author, ...person }, committer: { ...c.committer, ...person } });

const CASES = [
  { file: 'no-git.json', args: [], git: false },
  { file: 'git-two-projects.json', args: [], git: true },
  { file: 'shard-1-of-2.json', args: ['--shard=1/2'], git: true },
  { file: 'shard-2-of-2.json', args: ['--shard=2/2'], git: true },
];

for (const { file, args, git } of CASES) {
  const raw = join(tmp, file);
  const env = { ...process.env, LAB_RUN: '0', LAB_COMMIT: 'c0', LAB_OUT: join(tmp, 'cap'), PLAYWRIGHT_JSON_OUTPUT_FILE: raw };
  if (git) env.LAB_GIT = '1';
  else delete env.LAB_GIT;
  // A non-zero exit is expected when the phone project fails.
  spawnSync(`npx playwright test --config flake-lab/playwright.config.ts --grep responsive ${args.join(' ')}`, { cwd: root, shell: true, stdio: 'ignore', env });
  const report = JSON.parse(scrub(readFileSync(raw, 'utf8')));
  tidyCommit(report.config.metadata?.gitCommit);
  for (const p of [...report.config.projects, ...(report.config.filteredProjects ?? [])]) tidyCommit(p.metadata?.gitCommit);
  writeFileSync(join(outDir, file), JSON.stringify(report, null, 2) + '\n');
  console.log(`captured ${file}`);
}
