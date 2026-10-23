import AxeBuilder from '@axe-core/playwright';
import { expect, mockApi, test } from './fixtures';

/**
 * Accesibilidad (WCAG 2.1 A/AA) con axe-core sobre las rutas públicas clave.
 * Falla solo con violaciones `critical` o `serious` nuevas (ver KNOWN_DEBT);
 * todas, incluidas `moderate`/`minor`, se reportan como anotaciones y adjunto JSON.
 */
const ROUTES = [
  { name: 'home', path: '/', ready: (page: import('@playwright/test').Page) => expect(page.getByRole('heading', { level: 1 })).toBeVisible() },
  { name: 'catalog', path: '/tours', ready: (page: import('@playwright/test').Page) => expect(page.locator('.modern-card h3').first()).toBeVisible() },
  { name: 'tour detail', path: '/tour/arenal-hot-springs', ready: (page: import('@playwright/test').Page) => expect(page.getByRole('heading', { level: 1 })).toContainText(/Arenal/) },
];

const BLOCKING = new Set(['critical', 'serious']);

/**
 * Deuda conocida en main (2026-10-22), fuera del alcance de este PR porque vive en
 * archivos de otros carriles (Header, CookiesBanner, HeroSection/HomeQuickNav,
 * TourFacts). Cualquier violación critical/serious NUEVA (otra regla u otra ruta)
 * hace fallar la prueba. Al corregir una regla, quitarla de aquí.
 */
const KNOWN_DEBT: Record<string, string[]> = {
  '/': ['color-contrast', 'label-content-name-mismatch', 'select-name'],
  '/tours': ['color-contrast', 'label-content-name-mismatch'],
  '/tour/arenal-hot-springs': ['color-contrast', 'label-content-name-mismatch'],
};

for (const route of ROUTES) {
  test(`a11y: ${route.name} (${route.path}) sin violaciones critical/serious`, async ({ page }, testInfo) => {
    await mockApi(page);
    await page.goto(route.path);
    await route.ready(page);
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Mapas/iframes de terceros no son contenido propio.
      .exclude('.leaflet-container')
      .exclude('iframe')
      .analyze();

    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      help: v.help,
      targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
    }));
    await testInfo.attach(`axe-${route.name}.json`, { body: JSON.stringify(summary, null, 2), contentType: 'application/json' });
    for (const v of summary) {
      testInfo.annotations.push({ type: `axe:${v.impact}`, description: `${v.id} (${v.nodes}) ${v.help}` });
    }
    console.log(`[axe] ${route.path}: ${JSON.stringify(summary)}`);

    const known = new Set(KNOWN_DEBT[route.path] ?? []);
    const blocking = summary.filter((v) => v.impact && BLOCKING.has(v.impact) && !known.has(v.id));
    expect(blocking, `Violaciones critical/serious en ${route.path}`).toEqual([]);
  });
}
