import { test, expect, mockApi, expectNoConsoleErrors } from './fixtures';
import catalog from '../../src/data/catalogTours.json' with { type: 'json' };

const tour = catalog.tours.find(t => t.priceUSD > 0)!;

const forecast = {
  success: true,
  source: 'open-meteo',
  rainAlert: true,
  days: [
    { date: '2026-10-20', weatherCode: 3, tempMaxC: 27, tempMinC: 19, precipitationProbability: 20, precipitationMm: 0.2 },
    { date: '2026-10-21', weatherCode: 61, tempMaxC: 25, tempMinC: 18, precipitationProbability: 85, precipitationMm: 14 },
    { date: '2026-10-22', weatherCode: 2, tempMaxC: 28, tempMinC: 19, precipitationProbability: 10, precipitationMm: 0 },
    { date: '2026-10-23', weatherCode: 0, tempMaxC: 29, tempMinC: 20, precipitationProbability: 5, precipitationMm: 0 },
    { date: '2026-10-24', weatherCode: 95, tempMaxC: 24, tempMinC: 18, precipitationProbability: 40, precipitationMm: 3 },
  ],
};

test('tour detail shows a 5-day Open-Meteo forecast with a rain notice', async ({ page, consoleProblems }) => {
  await page.addInitScript(() => { if (window === window.top) localStorage.setItem('cookie-consent', 'essential'); });
  await mockApi(page);
  let requested = '';
  await page.route('**/api/weather/forecast**', (route) => {
    requested = route.request().url();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(forecast) });
  });
  await page.goto(`/tour/${tour.id}`);
  const weather = page.getByTestId('tour-weather');
  await expect(weather).toBeVisible();
  await expect(weather.locator('li')).toHaveCount(5);
  await expect(weather.getByRole('status')).toContainText('Se espera lluvia');
  await expect(weather.getByRole('link', { name: 'Open-Meteo' })).toHaveAttribute('href', 'https://open-meteo.com/');
  expect(requested).toMatch(/lat=-?\d+\.\d{2}&lon=-?\d+\.\d{2}/);
  expectNoConsoleErrors(consoleProblems);
});

test('tour detail hides the forecast silently when the service fails', async ({ page, consoleProblems }) => {
  await page.addInitScript(() => { if (window === window.top) localStorage.setItem('cookie-consent', 'essential'); });
  await mockApi(page);
  await page.route('**/api/weather/forecast**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"success":false}' }));
  await page.goto(`/tour/${tour.id}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByTestId('tour-weather')).toHaveCount(0);
  // A failed fetch logs "Failed to load resource" (503) in Chromium; that is expected network noise.
  expectNoConsoleErrors(consoleProblems.filter(p => !/Failed to load resource/.test(p.text)));
});
