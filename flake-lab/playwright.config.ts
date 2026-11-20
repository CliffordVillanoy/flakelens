import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  outputDir: 'out',
  retries: 1,
  workers: 1,
  reporter: 'json', // path comes from PLAYWRIGHT_JSON_OUTPUT_FILE
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
