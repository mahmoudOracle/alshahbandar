import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  testDir: 'e2e',
});
