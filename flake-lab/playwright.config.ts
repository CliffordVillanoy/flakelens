import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  outputDir: process.env.LAB_OUT ?? 'out', // one folder per run, so runs can go side by side
  timeout: 90_000, // simulated slow pages: an attempt can take up to 40 s
  retries: 1,
  workers: 1,
  reporter: 'json', // path comes from PLAYWRIGHT_JSON_OUTPUT_FILE
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
