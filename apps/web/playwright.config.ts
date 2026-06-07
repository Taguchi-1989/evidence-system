import { defineConfig, devices } from '@playwright/test';

/**
 * e2e は起動済みの dev サーバ（API:8787 / Web:5173）に対して実行する。
 *   前提: `pnpm stack:up && pnpm seed && pnpm dev`
 *   実行: `pnpm --filter @evidence/web e2e:install`（初回のみ）→ `pnpm e2e`
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
