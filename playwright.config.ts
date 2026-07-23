import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview',
    port: 4173,
    env: {
      VITE_SUPABASE_URL: 'http://localhost:0',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key-for-e2e',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
