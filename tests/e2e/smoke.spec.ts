import { expect, expectNoConsoleErrors, mockApi, MOCK_BOOKING_ID, test } from './fixtures';

const TOUR_ID = 'arenal-hot-springs';

test.beforeEach(async ({ page }) => {
  // Essential-only consent, as if the visitor clicked "Rechazar", so the banner does not cover the flows.
  await page.addInitScript(() => { if (window === window.top) window.localStorage.setItem('cookie-consent', 'essential'); });
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
  await firstCard.getByRole('link', { name: 'Consultar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  expectNoConsoleErrors(consoleProblems);
});

test('tour detail page renders from a deep link', async ({ page, consoleProblems }) => {
  await mockApi(page);
  await page.goto(`/tour/${TOUR_ID}`);
  await expect(page).toHaveURL(new RegExp(`/tour/${TOUR_ID}/?$`));
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

test('Sofía prefers the server extraction: understood lines, reference quote and WhatsApp hand-off', async ({ page, consoleProblems }) => {
  const whatsappMessage = 'Hola, quiero cotizar esta experiencia:\n• Experiencia: rafting en Pacuare\n• Personas: 2\n• Presupuesto: US$300 total';
  await mockApi(page, {
    conciergeExtra: {
      understood: { language: 'es', activity: 'rafting', tourId: 'pacuare-rafting', people: 2, month: 12, region: 'pacuare', asksPrice: true },
      quote: { kind: 'reference', subjectToConfirmation: true, operatorConfirmed: false, tourId: 'pacuare-rafting', unitPriceUSD: 110, people: 2, totalUSD: 220, line: 'US$110 × 2 personas = US$220 (referencia, sujeto a confirmación)' },
      inquiryHandoff: {
        source: 'server',
        understood: ['Experiencia: rafting en Pacuare', 'Personas: 2', 'Fecha: 2026-12-15', 'Presupuesto: US$300 total'],
        tourId: 'pacuare-rafting',
        referenceLine: 'US$110 × 2 personas = US$220 (referencia, sujeto a confirmación)',
        operatorNote: 'El operador todavía no está confirmado para esta experiencia.',
        whatsappMessage,
        whatsappUrl: `https://wa.me/50687959148?text=${encodeURIComponent(whatsappMessage)}`,
      },
    },
  });
  await page.goto('/ai');
  await page.getByPlaceholder(/Pregunta a/).fill('rafting Pacuare 2 personas 15 de diciembre presupuesto US$300');
  await page.getByRole('button', { name: /enviar/i }).click();
  const card = page.locator('[data-inquiry-handoff="true"]').last();
  await expect(card).toBeVisible();
  await expect(card.getByText('Presupuesto: US$300 total')).toBeVisible();
  await expect(card.getByText('Fecha: 2026-12-15')).toBeVisible();
  await expect(card.getByText(/US\$220 \(referencia, sujeto a confirmación\)/)).toBeVisible();
  const link = card.locator('a[data-human-handoff="true"]');
  await expect(link).toHaveAttribute('href', /^https:\/\/wa\.me\/50687959148\?text=/);
  await expect(page.getByText(/Reserva Confirmada/)).toHaveCount(0);
  expectNoConsoleErrors(consoleProblems);
});

test('leads pipeline admin route is guarded and never lists leads anonymously', async ({ page, consoleProblems }) => {
  await mockApi(page);
  const leadRequests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/admin/leads')) leadRequests.push(request.url()); });
  await page.goto('/admin/leads');
  await expect(page.getByRole('heading', { name: 'Administración' })).toBeVisible();
  await expect(page.locator('[data-leads-pipeline="true"]')).toHaveCount(0);
  expect(leadRequests).toHaveLength(0);
  expectNoConsoleErrors(consoleProblems);
});
