import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'cd apps/server && NODE_OPTIONS="--require dotenv/config" DOTENV_CONFIG_PATH=.env.test pnpm dev',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      timeout: 20000,
    },
    {
      command: 'cd apps/web && pnpm dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 20000,
    },
  ],
});
