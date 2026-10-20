import { test, expect, mockApi, expectNoConsoleErrors } from './fixtures';
import catalog from '../../src/data/catalogTours.json' with { type: 'json' };

const tour = catalog.tours.find(t => t.priceUSD > 0)!;

for (const language of ['es', 'en'] as const) {
  test.describe(`tour detail ${language}`, () => {
    test.use({ locale: language === 'es' ? 'es-CR' : 'en-US' });
    test('no operator source, map, related link, reload and inquiry CTA', async ({ page, consoleProblems }, testInfo) => {
      await page.addInitScript(() => { if (window === window.top) localStorage.setItem('cookie-consent', 'essential'); });
      await mockApi(page);
      await page.goto(`/tour/${tour.id}`);
      const title = language === 'es' ? tour.titleEs : tour.titleEn;
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page).toHaveTitle(`${title} | Costa Rica Tours`);
      await expect(page.getByRole('link', { name: language === 'es' ? 'fuente' : 'source', exact: true })).toHaveCount(0);
      await expect(page.getByText(language === 'es' ? `Revisado por nuestro equipo el ${catalog.reviewedAt}` : `Reviewed by our team on ${catalog.reviewedAt}`)).toBeVisible();
      await expect(page.getByRole('button', { name: language === 'es' ? 'Consultar disponibilidad' : 'Check availability', exact: true })).toBeVisible();
      await expect(page.locator('iframe[title]')).toHaveCount(1);
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded();
      const screenshot = testInfo.outputPath(`tour-${language}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      await testInfo.attach(`tour-${language}`, { path: screenshot, contentType: 'image/png' });
      const related = page.getByRole('region', { name: language === 'es' ? 'Ubicación y tours similares' : 'Location and similar tours' }).getByRole('link').first();
      const nextTitle = await related.innerText();
      await related.click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(nextTitle);
      await expect(page).toHaveTitle(`${nextTitle} | Costa Rica Tours`);
      expectNoConsoleErrors(consoleProblems);
    });
  });
}

test('prerender exposes real catalog text without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/tour/${tour.id}/index.html`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(tour.titleEs);
  await expect(page.locator('section[lang="en"]')).toContainText(tour.titleEn);
  await expect(page.getByRole('link', { name: 'Fuente del operador' })).toHaveCount(0);
  await expect(page.locator('section[lang="es"]')).toContainText('Operador local seleccionado por Costa Rica Tours');
  await context.close();
});

/** True when the element's centre is not covered by another element (e.g. the cookie notice). */
async function isUncovered(locator: import('@playwright/test').Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return Boolean(hit && (hit === el || el.contains(hit)));
  });
}

const priceText = { es: `desde US$${Math.round(tour.priceUSD).toLocaleString('en-US')}`, en: `from US$${Math.round(tour.priceUSD).toLocaleString('en-US')}` };

for (const language of ['es', 'en'] as const) {
  const es = language === 'es';
  const cta = es ? 'Cotizar / Reservar' : 'Get a quote / Book';
  const submit = es ? 'Enviar solicitud' : 'Send request';

  test.describe(`tour quote CTA ${language}`, () => {
    test.use({ locale: es ? 'es-CR' : 'en-US' });

    test('desktop: CTA next to title opens the quote form; cookie notice does not cover submit', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await mockApi(page);
      await page.goto(`/tour/${tour.id}`);
      await expect(page.getByTestId('cookies-banner')).toBeVisible();
      const block = page.getByTestId('tour-cta');
      await expect(block.getByTestId('tour-cta-price')).toHaveText(priceText[language]);
      await expect(block).toContainText(es ? 'sujeto a confirmación' : 'subject to confirmation');
      await expect(page.getByTestId('tour-cta-mobile')).toBeHidden();
      await block.getByRole('button', { name: cta, exact: true }).click();
      const form = page.getByRole('form', { name: es ? 'Solicitar cotización' : 'Request a quote' });
      await expect(form).toBeInViewport();
      await expect(form.getByRole('textbox').first()).toBeFocused();
      const send = form.getByRole('button', { name: submit });
      await send.scrollIntoViewIfNeeded();
      await expect(send).toBeInViewport();
      expect(await isUncovered(send)).toBe(true);
    });

    test('mobile: fixed bottom bar with price opens the form and hides; submit stays clickable', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await mockApi(page);
      await page.goto(`/tour/${tour.id}`);
      const banner = page.getByTestId('cookies-banner');
      await expect(banner).toBeVisible();
      const bar = page.getByTestId('tour-cta-mobile');
      await expect(bar).toBeVisible();
      await expect(bar).toContainText(priceText[language]);
      const barBox = (await bar.boundingBox())!;
      const bannerBox = (await banner.boundingBox())!;
      expect(barBox.y + barBox.height).toBeLessThanOrEqual(bannerBox.y + 1);
      await bar.getByRole('button', { name: cta, exact: true }).click();
      const form = page.getByRole('form', { name: es ? 'Solicitar cotización' : 'Request a quote' });
      await expect(form).toBeInViewport();
      await expect(bar).toBeHidden();
      const send = form.getByRole('button', { name: submit });
      await send.scrollIntoViewIfNeeded();
      expect(await isUncovered(send)).toBe(true);
      await banner.getByRole('button', { name: es ? 'Rechazar' : 'Reject' }).click();
      await expect(banner).toBeHidden();
      expect(await page.evaluate(() => document.body.style.paddingBottom)).toBe('');
    });
  });
}
