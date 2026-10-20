import { expect, expectNoConsoleErrors, mockApi, test } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Regresión: las marcas del mapa no se desplazan al hacer zoom, desplazar o
 * cambiar el tamaño del contenedor. Compara la posición en pantalla de cada
 * marca con la proyección Web Mercator de su coordenada (data-lat/data-lng)
 * respecto del centro y zoom que Leaflet publica en el contenedor.
 */
const MAP = '#costa-rica-leaflet-map-canvas';
const TOLERANCE_PX = 3;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (window === window.top) window.localStorage.setItem('cookie-consent', 'essential'); });
});

async function maxMarkerError(page: Page): Promise<{ checked: number; maxError: number }> {
  return page.evaluate(({ selector }) => {
    const container = document.querySelector<HTMLElement>(selector);
    if (!container || container.classList.contains('leaflet-zoom-anim')) return { checked: 0, maxError: Infinity };
    const zoom = Number(container.dataset.zoom);
    const cLat = Number(container.dataset.centerLat);
    const cLng = Number(container.dataset.centerLng);
    if (![zoom, cLat, cLng].every(Number.isFinite)) return { checked: 0, maxError: Infinity };
    const scale = 256 * 2 ** zoom;
    const proj = (lat: number, lng: number) => {
      const sin = Math.sin((lat * Math.PI) / 180);
      return { x: (scale * (lng + 180)) / 360, y: scale * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) };
    };
    const rect = container.getBoundingClientRect();
    const c = proj(cLat, cLng);
    let checked = 0;
    let maxError = 0;
    container.querySelectorAll<HTMLElement>('.leaflet-marker-icon[data-lat]').forEach((el) => {
      const p = proj(Number(el.dataset.lat), Number(el.dataset.lng));
      const ex = p.x - c.x + container.clientWidth / 2;
      const ey = p.y - c.y + container.clientHeight / 2;
      if (ex < 0 || ey < 0 || ex > container.clientWidth || ey > container.clientHeight) return;
      const b = el.getBoundingClientRect();
      const ax = b.left + b.width / 2 - rect.left;
      const ay = b.top + b.height / 2 - rect.top;
      maxError = Math.max(maxError, Math.hypot(ax - ex, ay - ey));
      checked += 1;
    });
    return { checked, maxError };
  }, { selector: MAP });
}

async function expectMarkersOnTheirCoordinates(page: Page, label: string, requireMarkers = true) {
  await expect
    .poll(async () => {
      const r = await maxMarkerError(page);
      if (r.checked === 0 && !requireMarkers && Number.isFinite(r.maxError)) return 'ok';
      return r.checked > 0 && r.maxError <= TOLERANCE_PX ? 'ok' : `checked=${r.checked} maxError=${r.maxError.toFixed(1)}px`;
    }, { message: `marcas fuera de su coordenada (${label})`, timeout: 15_000 })
    .toBe('ok');
}

test('map markers stay on their coordinates through zoom, pan and resize', async ({ page, consoleProblems }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/map');
  await expect(page.locator(`${MAP}.leaflet-container`)).toBeVisible();
  await expect(page.locator(`${MAP} .leaflet-marker-icon[data-lat]`).first()).toBeAttached();
  await expectMarkersOnTheirCoordinates(page, 'carga inicial');

  // Ningún par de marcas de tour comparte coordenada: las apiladas se agrupan en una con conteo.
  const duplicated = await page.evaluate((selector) => {
    const seen = new Set<string>();
    let dup = 0;
    document.querySelectorAll<HTMLElement>(`${selector} .custom-tour-pin[data-lat]`).forEach((el) => {
      const k = `${el.dataset.lat},${el.dataset.lng}`;
      if (seen.has(k)) dup += 1;
      seen.add(k);
    });
    return dup;
  }, MAP);
  expect(duplicated).toBe(0);

  for (let i = 0; i < 2; i += 1) {
    const before = await page.locator(MAP).getAttribute('data-zoom');
    await page.locator('#map-zoom-in-control').click();
    await expect(page.locator(MAP)).not.toHaveAttribute('data-zoom', before!);
    await expectMarkersOnTheirCoordinates(page, `zoom +${i + 1}`);
  }

  const box = (await page.locator(MAP).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2 - 60, { steps: 8 });
  await page.mouse.up();
  await expectMarkersOnTheirCoordinates(page, 'desplazamiento', false);

  await page.locator('#map-zoom-out-control').click();
  await expectMarkersOnTheirCoordinates(page, 'zoom -1', false);

  // Cambio de tamaño del contenedor sin recargar (móvil): ResizeObserver → invalidateSize.
  await page.setViewportSize({ width: 390, height: 844 });
  await expectMarkersOnTheirCoordinates(page, 'resize móvil', false);

  expectNoConsoleErrors(consoleProblems);
});
