// Runs the flake lab 12 times (6 commits x 2 runs) and writes fixtures/lab and public/sample.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import console from 'node:console';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const labDir = join(root, 'fixtures', 'lab');
const sampleDir = join(root, 'public', 'sample');
const RUNS = 12;

// Reports hold absolute paths; replace the checkout location so committed files carry no local path.
const scrub = (text) =>
  [JSON.stringify(root).slice(1, -1), root, root.replaceAll('\\', '/')]
    .reduce((t, p) => t.split(p).join('/repo'), text)
    .split(JSON.stringify(process.execPath).slice(1, -1))
    .join('node')
    // On Windows the rest of a path keeps its backslashes (escaped in JSON): "/repo\\flake-lab\\lib\\x.ts" -> "/repo/flake-lab/lib/x.ts".
    .replace(/\/repo((?:\\\\[\w.@-]+)+)/g, (_, rest) => '/repo' + rest.replaceAll('\\\\', '/'));

rmSync(labDir, { recursive: true, force: true });
rmSync(sampleDir, { recursive: true, force: true });
mkdirSync(labDir, { recursive: true });
mkdirSync(sampleDir, { recursive: true });

// The 12 runs go side by side (a few at a time): each one only waits on seeded timers, and one after another they
// would take about half an hour. Every run has its own output folder.
const CONCURRENCY = Number(process.env.LAB_CONCURRENCY ?? 6);
const started = Date.now();
const manifest = Array.from({ length: RUNS }, (_, run) => ({
  file: `run-${String(run).padStart(2, '0')}.json`,
  commit: `c${Math.floor(run / 2)}`,
}));

const runOne = (run) =>
  new Promise((resolveRun, reject) => {
    const { file, commit } = manifest[run];
    const out = join(labDir, file);
    // A non-zero exit is expected: the lab contains failing tests on purpose.
    const child = spawn('npx playwright test --config flake-lab/playwright.config.ts', {
      cwd: root,
      shell: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        LAB_RUN: String(run),
        LAB_COMMIT: commit,
        LAB_OUT: join(root, 'flake-lab', 'out', `run-${run}`),
        PLAYWRIGHT_JSON_OUTPUT_FILE: out,
      },
    });
    child.on('error', reject);
    child.on('close', () => {
      const text = scrub(readFileSync(out, 'utf8'));
      writeFileSync(out, text);
      writeFileSync(join(sampleDir, file), text);
      console.log(`lab run ${run} (${commit}) -> ${file}`);
      resolveRun();
    });
  });

const queue = Array.from({ length: RUNS }, (_, i) => i);
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let run = queue.shift(); run !== undefined; run = queue.shift()) await runOne(run);
  }),
);
console.log(`lab runs took ${Math.round((Date.now() - started) / 1000)} s (${CONCURRENCY} at a time)`);
writeFileSync(join(labDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

// run-bad.json: run 0 with two results missing status and one spec missing its title.
const bad = JSON.parse(readFileSync(join(labDir, 'run-00.json'), 'utf8'));
const specs = [];
const walk = (suite) => {
  specs.push(...(suite.specs ?? []));
  (suite.suites ?? []).forEach(walk);
};
bad.suites.forEach(walk);
delete specs[0].tests[0].results[0].status;
delete specs[1].tests[0].results[0].status;
delete specs[2].title;
writeFileSync(join(sampleDir, 'run-bad.json'), JSON.stringify(bad, null, 2) + '\n');
writeFileSync(
  join(sampleDir, 'manifest.json'),
  JSON.stringify([...manifest, { file: 'run-bad.json', commit: 'c0' }], null, 2) + '\n',
);
console.log('lab done');
