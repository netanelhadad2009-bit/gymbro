import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Stability/Chaos E2E Tests
 *
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000, // 90s per test (accounts for API timeouts)
  retries: 1, // Retry once on failure
  workers: 1, // Run tests serially for stability testing

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],

  use: {
    baseURL: process.env.PW_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 390, height: 844 }, // iPhone 14 dimensions
  },

  projects: [
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
