import { test, expect, type Page } from '@playwright/test';

/**
 * QualityAgent diario (#393). Solo lectura: no envía formularios reales,
 * no crea leads, no hace merges. Cada test lleva su severidad en la anotación.
 */
const OFFICIAL_WA = /^https:\/\/wa\.me\/50687959148(\?text=[^#\s]+)?$/;

async function sitemapUrls(page: Page): Promise<string[]> {
  const res = await page.request.get('/sitemap.xml');
  expect(res.status(), 'sitemap.xml responde').toBe(200);
  return [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

/** Muestra determinista por día: cambia a diario y es reproducible. */
function dailySample<T>(items: T[], size: number): T[] {
  const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  const step = Math.max(1, Math.floor(items.length / size));
  const offset = seed % step;
  return items.filter((_, i) => i % step === offset).slice(0, size);
}

test('[alta] sin 404 internos en una muestra del sitemap', async ({ page }) => {
  test.info().annotations.push({ type: 'severity', description: 'alta' });
  const base = new URL(test.info().project.use.baseURL!);
  const urls = (await sitemapUrls(page)).map(u => { const x = new URL(u); return new URL(x.pathname + x.search, base).toString(); });
  const broken: string[] = [];
  for (const url of dailySample(urls, 20)) {
    const res = await page.request.get(url, { maxRedirects: 5 });
    if (res.status() >= 400) broken.push(`${res.status()} ${new URL(url).pathname}`);
  }
  expect(broken, `enlaces rotos: ${broken.join(', ')}`).toEqual([]);
});

test('[alta] el CTA de envío muestra loading y success (envío interceptado)', async ({ page }) => {
  test.info().annotations.push({ type: 'severity', description: 'alta' });
  await page.route('**/api/leads/quote-request', async route => {
    await new Promise(r => setTimeout(r, 800));
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ success: true, status: 'nuevo', reference: 'CRT-QA000001' }) });
  });
  const tours = (await sitemapUrls(page)).filter(u => /\/tour\//.test(u)).slice(0, 8);
  let tested = false;
  for (const url of tours) {
    await page.goto(new URL(url).pathname);
    const form = page.getByRole('form', { name: /Solicitar cotización|Request a quote/ });
    if (!(await form.count())) continue;
    await form.getByLabel(/^Nombre|^Name/).fill('QA Agent');
    await form.getByLabel(/Correo electrónico|Email/).fill('qa-agent@costaricatours.invalid');
    await form.locator('input[type="checkbox"]').first().check();
    await page.waitForTimeout(3500); // guardia anti-bot "demasiado rápido"
    await form.getByRole('button', { name: /Enviar solicitud|Send request/ }).click();
    await expect(form.getByRole('button', { name: /Enviando|Sending/ })).toBeVisible();
    await expect(page.getByTestId('tour-quote-success')).toBeVisible();
    tested = true;
    break;
  }
  expect(tested, 'ninguna ficha de la muestra mostró el formulario de cotización').toBe(true);
});

test('[media] moneda coherente en el catálogo', async ({ page }) => {
  test.info().annotations.push({ type: 'severity', description: 'media' });
  await page.goto('/tours', { waitUntil: 'domcontentloaded' });
  // Sin networkidle: el sitio mantiene conexiones abiertas (mapas, analítica).
  await page.waitForTimeout(4000);
  const text = await page.locator('body').innerText({ timeout: 10_000 });
  const usd = (text.match(/(US)?\$\s?\d/g) || []).length;
  const crc = (text.match(/₡\s?\d/g) || []).length;
  const eur = (text.match(/€\s?\d/g) || []).length;
  const kinds = [usd, crc, eur].filter(n => n > 0).length;
  expect(kinds, `mezcla de monedas sin selector: USD=${usd} CRC=${crc} EUR=${eur}`).toBeLessThanOrEqual(1);
});

test('[alta] el embudo "Cotizar" no avanza sin fecha (validación por paso)', async ({ page }) => {
  test.info().annotations.push({ type: 'severity', description: 'alta' });
  await page.addInitScript(() => { if (window === window.top) window.localStorage.setItem('cookie-consent', 'essential'); });
  await page.goto('/');
  await page.getByRole('button', { name: /^Cotizar$|^Get a quote$/ }).first().click();
  const next = page.getByTestId('funnel-next');
  await expect(next).toBeVisible();
  await next.click();
  await expect(page.getByTestId('funnel-error-startDate')).toBeVisible();
  await expect(page.getByText(/Paso 1 de 4|Step 1 of 4/)).toBeVisible();
});

test('[media] las páginas legales cargan', async ({ page }) => {
  test.info().annotations.push({ type: 'severity', description: 'media' });
  for (const path of ['/privacy', '/terms']) {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(res?.status() ?? 0, `${path} responde`).toBeLessThan(400);
    await expect(page.getByTestId('not-found-page')).toHaveCount(0);
    await expect(page.locator('h1').first()).toBeVisible();
  }
});

test('[alta] los deep-links de WhatsApp apuntan al número oficial', async ({ page }) => {
  test.info().annotations.push({ type: 'severity', description: 'alta' });
  const bad: string[] = [];
  for (const path of ['/', '/tours']) {
    await page.goto(path);
    const hrefs = await page.locator('a[href*="wa.me"], a[href*="whatsapp.com"]').evaluateAll(els => els.map(e => (e as HTMLAnchorElement).href));
    for (const href of hrefs) {
      if (!OFFICIAL_WA.test(href)) bad.push(href.slice(0, 80));
      else {
        const text = new URL(href).searchParams.get('text');
        if (text !== null && !text.trim()) bad.push(`${href.slice(0, 60)} (texto vacío)`);
      }
    }
  }
  expect(bad, `enlaces WhatsApp inválidos: ${bad.join(' | ')}`).toEqual([]);
});
