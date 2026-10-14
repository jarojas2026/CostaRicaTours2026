import { expect, expectNoConsoleErrors, mockApi, MOCK_BOOKING_ID, test } from './fixtures';

const TOUR_ID = 'arenal-hot-springs';

test.beforeEach(async ({ page }) => {
  // Essential-only consent, as if the visitor clicked "Rechazar", so the banner does not cover the flows.
  await page.addInitScript(() => window.localStorage.setItem('cookie-consent', 'essential'));
});

test('home loads with the main heading and navigation', async ({ page, consoleProblems }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/costa rica/i);
  await expect(page.getByRole('button', { name: 'Explorar experiencias' })).toBeVisible();
  expectNoConsoleErrors(consoleProblems);
});

test('catalog lists tours and opens a tour detail', async ({ page, consoleProblems }) => {
  await mockApi(page);
  await page.goto('/tours');
  const firstCard = page.locator('.modern-card').filter({ has: page.locator('h3') }).first();
  await expect(firstCard).toBeVisible();
  const title = (await firstCard.locator('h3').first().innerText()).trim();
  await firstCard.getByRole('button', { name: 'Consultar' }).click();
  await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
  expectNoConsoleErrors(consoleProblems);
});

test('tour detail page renders from a deep link', async ({ page, consoleProblems }) => {
  await mockApi(page);
  await page.goto(`/tour/${TOUR_ID}`);
  await expect(page).toHaveURL(new RegExp(`/tour/${TOUR_ID}$`));
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Arenal/);
  expectNoConsoleErrors(consoleProblems);
});

test('map page loads and toggles a layer', async ({ page, consoleProblems }) => {
  await mockApi(page);
  await page.goto('/map');
  await expect(page.locator('.leaflet-container')).toBeVisible();
  const hotels = page.getByRole('button', { name: /Hoteles/ });
  await expect(hotels).toHaveAttribute('aria-pressed', /true|false/);
  const before = await hotels.getAttribute('aria-pressed');
  await hotels.click();
  await expect(hotels).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
  await hotels.click();
  await expect(hotels).toHaveAttribute('aria-pressed', before!);
  expectNoConsoleErrors(consoleProblems);
});

test('AI assistant opens and answers through the concierge API', async ({ page, consoleProblems }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Preguntar a la IA' }).first().click();
  await expect(page).toHaveURL(/\/ai$/);
  const input = page.getByPlaceholder(/Pregunta a/);
  await expect(input).toBeVisible();
  await input.fill('¿Qué tours recomiendan en Arenal?');
  await page.getByRole('button', { name: /enviar/i }).click();
  await expect(page.getByText('Con gusto. Puedo registrar una solicitud de reserva para este tour.')).toBeVisible();
  expectNoConsoleErrors(consoleProblems);
});

test('in-chat booking request shows "pendiente de confirmación" (mocked network)', async ({ page, consoleProblems }) => {
  const { bookingRequests } = await mockApi(page, { bookableTourId: TOUR_ID });
  await page.goto('/ai');
  await page.getByPlaceholder(/Pregunta a/).fill('Quiero reservar el tour de Arenal');
  await page.getByRole('button', { name: /enviar/i }).click();
  await page.getByRole('button', { name: 'Solicitar reserva' }).click();

  const form = page.locator('form').filter({ has: page.getByPlaceholder('tu@email.com') });
  await form.locator('input[type="date"]').fill('2026-12-15');
  await form.getByPlaceholder('Ej: María Rodríguez').fill('Prueba E2E');
  await form.getByPlaceholder('tu@email.com').fill('e2e@example.com');
  await form.locator('button[type="submit"]').click();

  await expect(page.getByText(/pendiente de confirmación/)).toBeVisible();
  await expect(page.getByText(MOCK_BOOKING_ID)).toBeVisible();
  // Case-sensitive on purpose: the honest copy says "no es una reserva confirmada",
  // what must never appear is the old "Reserva Confirmada" success headline.
  await expect(page.getByText(/Reserva Confirmada/)).toHaveCount(0);

  expect(bookingRequests).toHaveLength(1);
  const payload = bookingRequests[0] as Record<string, unknown>;
  expect(payload.tourId).toBe(TOUR_ID);
  expect(payload.date).toBe('2026-12-15');
  // The client never chooses the booking id, status or payment state.
  expect(payload).not.toHaveProperty('status');
  expect(payload).not.toHaveProperty('bookingId');
  expectNoConsoleErrors(consoleProblems);
});
