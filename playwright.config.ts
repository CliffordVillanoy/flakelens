import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the production build served by `vite preview` under /flakelens/, the same
// sub-path GitHub Pages uses. Chromium only. `npm run e2e` builds first.
const PORT = 4173;
const BASE = `http://localhost:${PORT}/flakelens/`;

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 2,
  // CI collects a JSON report (DEV-49) that FlakeLens itself can import: one retry, so a flaky test shows as flaky, and the git
  // commit in the report. Locally nothing changes: the list reporter, no retries.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['json', { outputFile: 'test-results/report.json' }]] : [['list']],
  captureGitInfo: process.env.CI ? { commit: true } : undefined,
  use: { baseURL: BASE, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort --base /flakelens/`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
