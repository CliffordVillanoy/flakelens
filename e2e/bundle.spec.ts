import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

// Static checks on the production build (npm run e2e builds first).
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });

test('dist holds no test helpers, and the report parser is only in the worker', () => {
  const js = files('dist').filter((f) => f.endsWith('.js'));
  expect(js.length).toBeGreaterThan(1);
  for (const f of js) {
    const code = readFileSync(f, 'utf8');
    expect(code, f).not.toContain('buildDataset');
    expect(code, f).not.toContain('testkit');
  }
  const main = js.filter((f) => path.basename(f).startsWith('index-'));
  const worker = js.filter((f) => path.basename(f).startsWith('worker-'));
  expect(main).toHaveLength(1);
  expect(worker).toHaveLength(1);
  // zod/mini checks stored rows on the page; the Playwright report parser (full zod) stays in the worker.
  expect(readFileSync(main[0]!, 'utf8')).not.toContain('projectName');
  expect(readFileSync(worker[0]!, 'utf8')).toContain('projectName');
  const kb = Math.round(statSync(main[0]!).size / 1000);
  console.log(`bundle: main ${kb} kB, worker ${Math.round(statSync(worker[0]!).size / 1000)} kB`);
  expect(kb).toBeLessThan(500); // below Vite's chunk warning
});

test('dist carries the self-hosted fonts and licences, and no external URLs in the page', () => {
  expect(files('dist/fonts').map((f) => path.basename(f))).toEqual(
    expect.arrayContaining(['MonaSans-Regular.woff2', 'JetBrainsMono-Regular.woff2', 'MonaSans-OFL.txt', 'JetBrainsMono-OFL.txt']),
  );
  const html = readFileSync('dist/index.html', 'utf8');
  expect(html).not.toMatch(/(src|href)="https?:/);
});
