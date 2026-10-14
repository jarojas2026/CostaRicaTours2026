import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke e2e contra el build de producción servido con `vite preview`.
 * La red de /api/** y de terceros se simula en tests/e2e/fixtures.ts, así que
 * no se necesita backend, Firebase ni claves reales.
 *
 * Local: `npx vite build && npm run test:e2e`. En entornos sin el Chromium de
 * Playwright (p. ej. linux-arm64) se puede usar uno del sistema con
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium.
 */
const PORT = Number(process.env.E2E_PORT || 4173);
// The readiness probe must reach the local preview directly, even behind an HTTP(S)_PROXY.
for (const key of ['NO_PROXY', 'no_proxy'] as const) {
  process.env[key] = [process.env[key], '127.0.0.1', 'localhost'].filter(Boolean).join(',');
}
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: 'es-CR',
    timezoneId: 'America/Costa_Rica',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: executablePath ? { executablePath } : {} },
    },
  ],
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
