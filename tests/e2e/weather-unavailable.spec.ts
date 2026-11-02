import { expect, mockApi, test } from './fixtures';

test('tour detail explains when weather forecast endpoint is unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockApi(page);
  await page.route('**/api/weather/forecast**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false }) }));
  await page.goto('/tour/arenal-hot-springs');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Arenal/i);
  await expect(page.getByTestId('tour-weather-unavailable')).toBeVisible();
  await expect(page.getByTestId('tour-weather-unavailable')).toContainText(/Pronóstico temporalmente no disponible/i);
});
