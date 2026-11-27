import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  outputDir: process.env.LAB_OUT ?? 'out', // one folder per run, so runs can go side by side
  timeout: 90_000, // simulated slow pages: an attempt can take up to 40 s
  retries: 1,
  workers: 1,
  // DEV-39: LAB_GIT=1 asks Playwright to record the git commit and branch in the report (off for the 12-run lab, so its fixtures stay as they are).
  captureGitInfo: process.env.LAB_GIT ? { commit: true, diff: false } : undefined,
  reporter: 'json', // path comes from PLAYWRIGHT_JSON_OUTPUT_FILE
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // DEV-35: one test (responsive.spec.ts) also runs on a phone viewport, where it fails and the desktop run passes (for DEV-40).
    { name: 'chromium-mobile', use: { ...devices['Pixel 5'] }, testMatch: /responsive\.spec\.ts/ },
  ],
});
