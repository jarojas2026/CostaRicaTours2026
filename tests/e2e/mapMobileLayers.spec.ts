import { devices } from '@playwright/test';
import { expect, mockApi, test } from './fixtures';

/**
 * /map en móvil (390×844, touch): el cajón de capas nacionales abre y cierra,
 * no tapa el mapa y se cierra con la X, con Escape y al tocar fuera; y la
 * página del mapa cabe en la pantalla sin desplazamientos raros.
 */
const VIEWPORT = { width: 390, height: 844 };
const { defaultBrowserType: _ignored, viewport: _v, ...iphone } = devices['iPhone 13'];

test.use({ ...iphone, viewport: VIEWPORT });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (window === window.top) window.localStorage.setItem('cookie-consent', 'essential'); });
  await mockApi(page);
  await page.goto('/map');
  await expect(page.locator('#costa-rica-leaflet-map-canvas.leaflet-container')).toBeVisible();
});

test('layers drawer opens, stays inside the viewport and leaves the map visible', async ({ page }) => {
  const toggle = page.locator('#national-poi-layers-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.tap();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const panel = page.locator('#national-poi-layers-panel');
  await expect(panel).toBeVisible();

  const box = (await panel.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORT.width + 1);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(VIEWPORT.height);
  // No tapa el mapa: ocupa como mucho la mitad del alto de la pantalla.
  expect(box.height).toBeLessThanOrEqual(VIEWPORT.height / 2);

  // Desplazar dentro del cajón no desplaza la página.
  const pageScroll = () => page.evaluate(() => [window.scrollY, ...Array.from(document.querySelectorAll<HTMLElement>('body *'))
    .filter(el => el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY) && !el.closest('#national-poi-layers-panel'))
    .map(el => el.scrollTop)]);
  const before = await pageScroll();
  await panel.hover();
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);
  expect(await panel.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(await pageScroll()).toEqual(before);

  await page.getByRole('button', { name: 'Cerrar selector de capas' }).tap();
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('layers drawer closes with Escape and when tapping outside', async ({ page }) => {
  const toggle = page.locator('#national-poi-layers-toggle');
  const panel = page.locator('#national-poi-layers-panel');

  await toggle.tap();
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();

  await toggle.tap();
  await expect(panel).toBeVisible();
  const map = (await page.locator('#costa-rica-leaflet-map-canvas').boundingBox())!;
  // Tocar el mapa, lejos del cajón (esquina superior derecha del área del mapa).
  await page.touchscreen.tap(map.x + map.width - 30, map.y + Math.min(map.height / 2, 300));
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  // El botón vuelve a alternar abrir/cerrar.
  await toggle.tap();
  await expect(panel).toBeVisible();
  await toggle.tap();
  await expect(panel).toBeHidden();
});

test('/map fits the mobile screen: map visible above the bottom navigation, no page overflow', async ({ page }) => {
  const map = (await page.locator('#costa-rica-leaflet-map-canvas').boundingBox())!;
  expect(map.width).toBeGreaterThan(200);
  expect(map.x + map.width).toBeLessThanOrEqual(VIEWPORT.width + 1);
  expect(map.height).toBeGreaterThan(300);
  const toggle = (await page.locator('#national-poi-layers-toggle').boundingBox())!;
  expect(toggle.y + toggle.height).toBeLessThanOrEqual(VIEWPORT.height);

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
