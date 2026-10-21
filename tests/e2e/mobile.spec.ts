import { devices, type Page } from '@playwright/test';
import { test, expect, mockApi, expectNoConsoleErrors } from './fixtures';
import catalog from '../../src/data/catalogTours.json' with { type: 'json' };

/**
 * Smoke móvil: 390×844 con user-agent, touch y DPR de iPhone y Pixel, sobre el
 * Chromium de CI (la emulación de dispositivo no requiere WebKit). Red simulada.
 */
const tour = catalog.tours.find(t => t.priceUSD > 0)!;
const VIEWPORT = { width: 390, height: 844 };

function deviceUse(name: 'iPhone 13' | 'Pixel 7') {
  const { defaultBrowserType: _ignored, viewport: _v, ...rest } = devices[name];
  return { ...rest, viewport: VIEWPORT };
}

/** Elementos visibles que sobresalen del ancho del viewport (para diagnosticar desbordes). */
async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const width = root.clientWidth;
    const offenders: string[] = [];
    if (root.scrollWidth > width) {
      document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.right <= width + 1) return;
        // Ignorar hijos de un ancestro que ya recorta su contenido.
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const o = getComputedStyle(p).overflowX;
          if (o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') return;
        }
        const id = el.id ? `#${el.id}` : '';
        const cls = typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 4).join('.')}` : '';
        offenders.push(`${el.tagName.toLowerCase()}${id}${cls} right=${Math.round(r.right)}`);
      });
    }
    return { scrollWidth: root.scrollWidth, clientWidth: width, offenders: offenders.slice(0, 10) };
  });
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const result = await horizontalOverflow(page);
  expect(result.scrollWidth, `${label}: scrollWidth ${result.scrollWidth} > clientWidth ${result.clientWidth}\n${result.offenders.join('\n')}`)
    .toBeLessThanOrEqual(result.clientWidth);
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
}

for (const deviceName of ['iPhone 13', 'Pixel 7'] as const) {
  test.describe(`mobile ${deviceName}`, () => {
    test.use(deviceUse(deviceName));

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => { if (window === window.top) localStorage.setItem('cookie-consent', 'essential'); });
    });

    test('home renders without horizontal overflow', async ({ page, consoleProblems }) => {
      await mockApi(page);
      await page.goto('/');
      await expect(page.getByRole('link', { name: /Costa Rica Tours, inicio/ })).toBeVisible();
      await settle(page);
      await expectNoHorizontalOverflow(page, 'home');
      expectNoConsoleErrors(consoleProblems);
    });

    test('menu opens and closes within the viewport', async ({ page }) => {
      await mockApi(page);
      await page.goto('/');
      const menuButton = page.getByRole('button', { name: /Menú de cuenta y preferencias/ });
      await menuButton.tap();
      await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      const panel = page.locator(`#${await menuButton.getAttribute('aria-controls')}`);
      await expect(panel).toBeVisible();
      const box = (await panel.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORT.width + 1);
      await expectNoHorizontalOverflow(page, 'menú abierto');
      await page.keyboard.press('Escape');
      await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });

    test('tour detail renders without horizontal overflow', async ({ page, consoleProblems }) => {
      await mockApi(page);
      await page.goto(`/tour/${tour.id}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(tour.titleEs);
      await expect(page.getByTestId('tour-cta-mobile')).toBeVisible();
      await settle(page);
      await expectNoHorizontalOverflow(page, `/tour/${tour.id}`);
      expectNoConsoleErrors(consoleProblems);
    });

    test('quote form can be filled on mobile (not submitted)', async ({ page }) => {
      await mockApi(page);
      const posts: string[] = [];
      page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/api/')) posts.push(new URL(r.url()).pathname); });
      await page.goto(`/tour/${tour.id}`);
      await page.getByTestId('tour-cta-mobile').getByRole('button', { name: 'Cotizar / Reservar', exact: true }).tap();
      const form = page.getByRole('form', { name: 'Solicitar cotización' });
      await expect(form).toBeInViewport();
      await form.getByLabel('Nombre', { exact: true }).fill('Prueba Móvil');
      await form.getByLabel('Correo electrónico', { exact: true }).fill('movil@example.com');
      await form.getByLabel('Personas', { exact: true }).fill('2');
      const send = form.getByRole('button', { name: 'Enviar solicitud' });
      await send.scrollIntoViewIfNeeded();
      await expect(send).toBeInViewport();
      await expectNoHorizontalOverflow(page, 'formulario de cotización');
      expect(posts.filter(p => !p.startsWith('/api/chat/'))).toEqual([]);
    });

    test('map loads on mobile', async ({ page }) => {
      await mockApi(page);
      await page.goto('/map');
      await expect(page.locator('#costa-rica-leaflet-map-canvas.leaflet-container')).toBeVisible();
      const box = (await page.locator('#costa-rica-leaflet-map-canvas').boundingBox())!;
      expect(box.width).toBeGreaterThan(200);
      expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORT.width + 1);
    });

    for (const path of ['/tours', '/ai', '/map'] as const) {
      test(`${path} has no horizontal overflow`, async ({ page }) => {
        await mockApi(page);
        await page.goto(path);
        await settle(page);
        await expectNoHorizontalOverflow(page, path);
      });
    }
  });
}
