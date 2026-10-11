import { defineConfig, devices } from '@playwright/test';

/**
 * Layout checks: every key page at the four supported widths must render
 * without horizontal overflow. Runs against a production build
 * (`npm run build` first); see e2e/layout.spec.ts.
 */
const PORT = Number(process.env.E2E_PORT ?? 3200);

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1024', width: 1024, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 90_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Use a preinstalled Chromium when provided (e.g. sandboxed environments).
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  projects: VIEWPORTS.map(({ name, width, height }) => ({
    name,
    use: { ...devices['Desktop Chrome'], viewport: { width, height } },
  })),
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
