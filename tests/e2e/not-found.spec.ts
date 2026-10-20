import { test, expect, mockApi, expectNoConsoleErrors } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (window === window.top) localStorage.setItem('cookie-consent', 'essential'); });
});

test('unknown route shows the 404 view (noindex) and its search goes to the catalog', async ({ page, consoleProblems }) => {
  await mockApi(page);
  await page.goto('/ruta-que-no-existe');
  const view = page.getByTestId('not-found-page');
  await expect(view.getByRole('heading', { level: 1 })).toHaveText('Esta página no existe');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  for (const name of ['Tours', 'Destinos', 'Asistente']) await expect(view.getByRole('link', { name, exact: true })).toBeVisible();
  await expect(view.getByRole('heading', { name: 'Tours populares' })).toBeVisible();
  await view.getByRole('searchbox').fill('volcan');
  await view.getByRole('button', { name: 'Buscar' }).click();
  await expect(page).toHaveURL(/\/tours\?q=volcan$/);
  await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute('content', /noindex/);
  expectNoConsoleErrors(consoleProblems);
});

test.describe('english', () => {
  test.use({ locale: 'en-US' });
  test('unknown tour id shows the tour 404 in English', async ({ page }) => {
    await mockApi(page);
    await page.goto('/tour/no-existe-xyz-123');
    const view = page.getByTestId('tour-not-found');
    await expect(view.getByRole('heading', { level: 1 })).toHaveText('Tour not found');
    await expect(view.getByRole('link', { name: 'Destinations', exact: true })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});

test('static 404.html works without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/404.html`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Esta página no existe');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  await expect(page.getByRole('link', { name: 'Tours', exact: true })).toBeVisible();
  await context.close();
});
