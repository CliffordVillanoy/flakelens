// Runs the flake lab 12 times (6 commits x 2 runs) and writes fixtures/lab and public/sample.
import { spawnSync } from 'node:child_process';
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
    .join('node');

rmSync(labDir, { recursive: true, force: true });
rmSync(sampleDir, { recursive: true, force: true });
mkdirSync(labDir, { recursive: true });
mkdirSync(sampleDir, { recursive: true });

const manifest = [];
for (let run = 0; run < RUNS; run++) {
  const file = `run-${String(run).padStart(2, '0')}.json`;
  const commit = `c${Math.floor(run / 2)}`;
  const out = join(labDir, file);
  // A non-zero exit is expected: the lab contains failing tests on purpose.
  const res = spawnSync('npx playwright test --config flake-lab/playwright.config.ts', {
    cwd: root,
    shell: true,
    stdio: 'ignore',
    env: { ...process.env, LAB_RUN: String(run), LAB_COMMIT: commit, PLAYWRIGHT_JSON_OUTPUT_FILE: out },
  });
  if (res.error) throw res.error;
  const text = scrub(readFileSync(out, 'utf8'));
  writeFileSync(out, text);
  writeFileSync(join(sampleDir, file), text);
  manifest.push({ file, commit });
  console.log(`lab run ${run} (${commit}) -> ${file}`);
}
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
