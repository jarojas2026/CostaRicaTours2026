import { test, expect, mockApi, expectNoConsoleErrors } from './fixtures';
import catalog from '../../src/data/operatorTours.json' with { type: 'json' };

const tour = catalog.tours.find(t => t.priceUSD > 0)!;

for (const language of ['es', 'en'] as const) {
  test.describe(`tour detail ${language}`, () => {
    test.use({ locale: language === 'es' ? 'es-CR' : 'en-US' });
    test('source, map, related link, reload and inquiry CTA', async ({ page, consoleProblems }, testInfo) => {
      await page.addInitScript(() => { if (window === window.top) localStorage.setItem('cookie-consent', 'essential'); });
      await mockApi(page);
      await page.goto(`/tour/${tour.id}`);
      const title = language === 'es' ? tour.titleEs : tour.titleEn;
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page).toHaveTitle(`${title} | Costa Rica Tours`);
      await expect(page.getByRole('link', { name: language === 'es' ? 'fuente' : 'source', exact: true })).toHaveAttribute('href', tour.sourceUrl);
      await expect(page.getByText(language === 'es' ? `Revisado el ${catalog.priceCheckedAt}` : `Checked on ${catalog.priceCheckedAt}`)).toBeVisible();
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
  await expect(page.getByRole('link', { name: 'Fuente del operador' })).toHaveAttribute('href', tour.sourceUrl);
  await context.close();
});
