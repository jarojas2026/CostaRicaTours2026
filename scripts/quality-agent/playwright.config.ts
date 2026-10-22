import { defineConfig, devices } from '@playwright/test';

/**
 * QualityAgent (#393): auditoría diaria de solo lectura contra producción.
 * Los envíos de formularios se interceptan en el navegador: nunca crea leads reales.
 */
export default defineConfig({
  testDir: '.',
  testMatch: /qualityAgent\.spec\.ts$/,
  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['json', { outputFile: 'quality-agent-results.json' }]],
  use: {
    baseURL: process.env.QUALITY_BASE_URL || 'https://costaricatours2026.vercel.app',
    locale: 'es-CR',
    timezoneId: 'America/Costa_Rica',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
