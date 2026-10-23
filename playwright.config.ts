import { defineConfig, devices } from '@playwright/test';

const PORT = 5178;

/**
 * End-to-end tests. Locally they use the installed Google Chrome (no browser download);
 * CI uses Playwright's bundled Chromium (`npx playwright install chromium`).
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    channel: process.env.CI ? undefined : 'chrome',
  },
  webServer: {
    // Empty FIRMS key: the live proxy reports "not configured" unless a test mocks /api/firms.
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: { FIRMS_MAP_KEY: '' },
    timeout: 60_000,
  },
});
