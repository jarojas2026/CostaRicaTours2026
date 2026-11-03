import { expect, mockApi, test } from './fixtures';

test('home shows a single weather note when the destinations weather source is unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => { if (window === window.top) localStorage.setItem('cookie-consent', 'essential'); });
  await mockApi(page);
  await page.route('**/api/weather/destinations**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false }) }));
  await page.goto('/');
  const note = page.getByTestId('destination-pulse-weather-unavailable');
  await note.scrollIntoViewIfNeeded();
  await expect(note).toBeVisible();
  await expect(note).toContainText(/Clima no disponible por ahora|Weather is not available right now/);
  // A lo sumo el indicador del encabezado de la sección; ya no se repite en cada una de las 5 tarjetas.
  expect(await page.getByText(/^(Clima no disponible|Weather unavailable)$/).count()).toBeLessThanOrEqual(1);
});

test('tour detail stays silent when the forecast endpoint is unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockApi(page);
  await page.route('**/api/weather/forecast**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false }) }));
  await page.goto('/tour/arenal-hot-springs');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Arenal/i);
  await expect(page.getByTestId('tour-weather-unavailable')).toHaveCount(0);
});
