import { test, expect, mockApi, expectNoConsoleErrors } from './fixtures';
import catalog from '../../src/data/catalogTours.json' with { type: 'json' };

const tour = catalog.tours.find(item => 'reviewedAt' in item && item.reviewedAt === '2026-10-22' && item.category === 'rural')!;

for (const language of ['es', 'en'] as const) {
  for (const width of [375, 1366]) {
    test.describe(`new researched catalog ${language} ${width}px`, () => {
      test.use({ locale: language === 'es' ? 'es-CR' : 'en-US', viewport: { width, height: 900 } });
      test('search → detail → quote receipt without a payment or real provider request', async ({ page, consoleProblems }) => {
        const es = language === 'es';
        await page.addInitScript(() => { if (window === window.top) localStorage.setItem('cookie-consent', 'essential'); });
        await mockApi(page);
        const requests: Record<string, unknown>[] = [];
        await page.route('**/api/leads/quote-request', route => {
          requests.push(route.request().postDataJSON());
          return route.fulfill({
            status: 202, contentType: 'application/json',
            body: JSON.stringify({ success: true, status: 'nuevo', reference: 'CRT-1A2B3C4D' }),
          });
        });
        await page.goto('/tours?q=Copey');
        const link = page.locator(`a[href="/tour/${tour.id}"]`).first();
        await expect(link).toBeVisible();
        await link.click();
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(es ? tour.titleEs : tour.titleEn);
        await expect(page.getByText(es ? 'Revisado por nuestro equipo el 2026-10-22' : 'Reviewed by our team on 2026-10-22')).toBeVisible();
        const cta = page.getByTestId(width < 768 ? 'tour-cta-mobile' : 'tour-cta');
        await cta.getByRole('button', { name: es ? 'Cotizar / Reservar' : 'Get a quote / Book' }).click();
        const form = page.getByRole('form', { name: es ? 'Solicitar cotización' : 'Request a quote' });
        await form.getByRole('textbox').first().fill('Catalog QA');
        await form.locator('input[type="email"]').fill('catalog@example.com');
        await form.locator('input[type="checkbox"]').first().check();
        await form.getByRole('button', { name: es ? 'Enviar solicitud' : 'Send request' }).click();
        await expect(page.getByTestId('tour-quote-reference')).toContainText('CRT-1A2B3C4D');
        expect(requests).toHaveLength(1);
        expect(requests[0].tourId).toBe(tour.id);
        await expect(page.getByRole('button', { name: es ? 'Continuar al pago' : 'Continue to payment', exact: true })).toHaveCount(0);
        expectNoConsoleErrors(consoleProblems);
      });
    });
  }
}
