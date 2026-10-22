import { expect, mockApi, test } from './fixtures';
import catalog from '../../src/data/catalogTours.json' with { type: 'json' };

const tour = catalog.tours.find(item => item.priceUSD > 0)!;

async function fillQuoteForm(page: import('@playwright/test').Page) {
  await page.addInitScript(() => { if (window === window.top) localStorage.setItem('cookie-consent', 'essential'); });
  await page.goto('/tour/' + tour.id);
  await page.getByTestId('tour-cta').getByRole('button', { name: 'Cotizar / Reservar' }).click();
  const form = page.getByRole('form', { name: 'Solicitar cotización' });
  await form.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Viajero Prueba');
  await form.getByLabel('Correo electrónico').fill('viajero@example.com');
  await form.locator('input[type="checkbox"]').first().check();
  return form;
}

test('tour quote: HTTP 202 without server reference never claims receipt', async ({ page }) => {
  await mockApi(page);
  const bodies: unknown[] = [];
  await page.route('**/api/leads/quote-request', route => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, status: 'nuevo' }),
    });
  });
  const form = await fillQuoteForm(page);
  await form.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(form.getByRole('alert')).toContainText('No pudimos verificar la recepción');
  await expect(page.getByTestId('tour-quote-success')).toHaveCount(0);
  expect(bodies).toHaveLength(1);
});

test('tour quote: accepted request with a valid server reference shows success', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/leads/quote-request', route => route.fulfill({
    status: 202,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, status: 'nuevo', reference: 'CRT-1A2B3C4D' }),
  }));
  const form = await fillQuoteForm(page);
  await form.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(page.getByTestId('tour-quote-success')).toBeVisible();
  await expect(page.getByTestId('tour-quote-reference')).toContainText('CRT-1A2B3C4D');
});
