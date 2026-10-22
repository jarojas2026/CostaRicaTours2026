import type { Page } from '@playwright/test';
import { expect, mockApi, test } from './fixtures';

/**
 * Embudo "Viaje a medida" (CustomFunnelModal): no avanza sin datos y el envío
 * muestra carga y luego éxito (con referencia CRT-) o error, según la API simulada.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (window === window.top) window.localStorage.setItem('cookie-consent', 'essential'); });
});

async function openFunnel(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Cotizar' }).first().click();
  await expect(page.getByRole('heading', { name: 'Diseña Tu Paquete a Costa Rica' })).toBeVisible();
}

async function fillUntilStep4(page: Page) {
  const next = page.getByTestId('funnel-next');
  await next.click();
  await expect(page.getByTestId('funnel-error-startDate')).toBeVisible();
  await expect(page.getByText(/Paso 1 de 4/)).toBeVisible();
  await page.locator('[data-funnel-field="startDate"]').fill('2027-03-15');
  await expect(page.getByTestId('funnel-error-startDate')).toHaveCount(0);
  await next.click();
  await expect(page.getByText(/Paso 2 de 4/)).toBeVisible();
  await next.click();
  await next.click();
  await expect(page.getByText(/Paso 4 de 4/)).toBeVisible();
}

test('custom funnel blocks empty steps and shows loading then success with a reference', async ({ page }) => {
  await mockApi(page);
  const intakeBodies: unknown[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/customer-intake', async route => {
    intakeBodies.push(route.request().postDataJSON());
    await gate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ intakeId: 'INT-1a2b3c4d-0000-4000-8000-000000000000', customer: { reply: 'Recibido.' } }),
    });
  });

  await openFunnel(page);
  await fillUntilStep4(page);

  // Sin nombre, correo ni consentimiento: errores visibles y nada se envía.
  await page.getByTestId('funnel-submit').click();
  await expect(page.getByTestId('funnel-error-customerName')).toBeVisible();
  await expect(page.getByTestId('funnel-error-customerEmail')).toBeVisible();
  await expect(page.getByTestId('funnel-error-consent')).toBeVisible();
  expect(intakeBodies).toHaveLength(0);

  await page.getByRole('textbox', { name: 'Nombre responsable' }).fill('Viajero Prueba');
  await page.getByRole('textbox', { name: 'Email' }).fill('viajero@example.com');
  await page.getByText(/Autorizo el tratamiento de mi nombre, correo, teléfono/).click();
  await page.getByTestId('funnel-submit').click();

  await expect(page.getByTestId('funnel-submit-loading')).toBeVisible();
  await expect(page.getByTestId('funnel-submit')).toBeDisabled();
  release();
  await expect(page.getByTestId('funnel-submit-success')).toBeVisible();
  await expect(page.getByTestId('funnel-submit-reference')).toContainText('CRT-1A2B3C4D');
  expect(intakeBodies).toHaveLength(1);
});

test('custom funnel shows a visible error with retry when the API fails', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/customer-intake', route => route.fulfill({
    status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'boom' }),
  }));

  await openFunnel(page);
  await fillUntilStep4(page);
  await page.getByRole('textbox', { name: 'Nombre responsable' }).fill('Viajero Prueba');
  await page.getByRole('textbox', { name: 'Email' }).fill('viajero@example.com');
  await page.getByText(/Autorizo el tratamiento de mi nombre, correo, teléfono/).click();
  await page.getByTestId('funnel-submit').click();

  await expect(page.getByTestId('funnel-submit-error')).toBeVisible();
  await expect(page.getByTestId('funnel-submit-error').getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await expect(page.getByTestId('funnel-submit-success')).toHaveCount(0);
});
