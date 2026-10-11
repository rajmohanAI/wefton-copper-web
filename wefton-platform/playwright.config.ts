import { defineConfig, devices } from '@playwright/test';

/**
 * Layout checks for the storefront at the four supported widths
 * (V2 spec Req 4: 375 / 768 / 1024 / 1440). Runs against a production
 * build: `npm run build` first. See e2e/layout.spec.ts.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

// Set PLAYWRIGHT_CHROMIUM_PATH to use a preinstalled Chromium instead of
// the one `npx playwright install` downloads.
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
  : {};

const desktop = devices['Desktop Chrome'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 90_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-375',
      use: { ...desktop, viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, launchOptions },
    },
    {
      name: 'tablet-768',
      use: { ...desktop, viewport: { width: 768, height: 1024 }, hasTouch: true, launchOptions },
    },
    {
      name: 'laptop-1024',
      use: { ...desktop, viewport: { width: 1024, height: 768 }, launchOptions },
    },
    {
      name: 'desktop-1440',
      use: { ...desktop, viewport: { width: 1440, height: 900 }, launchOptions },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
