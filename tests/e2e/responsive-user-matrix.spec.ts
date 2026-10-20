import { expect, mockApi, test } from './fixtures';

type Viewport = { label: string; width: number; height: number };
const VIEWPORTS: Viewport[] = [
  { label: 'small-phone', width: 320, height: 568 },
  { label: 'phone', width: 390, height: 844 },
  { label: 'mobile-landscape', width: 844, height: 390 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'laptop', width: 1280, height: 800 },
  { label: 'wide-desktop', width: 1920, height: 1080 },
];

async function expectNoPageOverflow(page: import('@playwright/test').Page) {
  const details = await page.evaluate(() => ({
    body: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    page: location.pathname,
  }));
  expect(details.body, `document overflow at ${details.page} ${details.viewport}px`).toBeLessThanOrEqual(details.viewport + 5);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (window === window.top) localStorage.setItem('cookie-consent', 'essential'); });
});

for (const viewport of VIEWPORTS) {
  test(`tour quote interaction and layout at ${viewport.label} ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockApi(page);
    await page.goto('/tour/arenal-hot-springs');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Arenal/i);
    await expectNoPageOverflow(page);

    const isPhoneWidth = viewport.width < 640;
    const cta = isPhoneWidth
      ? page.getByTestId('tour-cta-mobile')
      : page.getByTestId('tour-cta');
    await expect(cta).toBeVisible();
    await cta.getByRole('button', { name: /Cotizar \/ Reservar|Get a quote \/ Book/ }).click();

    const form = page.getByRole('form', { name: /Solicitar cotización|Request a quote/ });
    await expect(form).toBeInViewport();
    const submit = form.getByRole('button', { name: /Enviar solicitud|Send request/ });
    await submit.scrollIntoViewIfNeeded();
    const covered = await submit.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return !(hit && (el === hit || el.contains(hit)));
    });
    expect(covered, `quote submit covered at ${viewport.label}`).toBe(false);
    await expectNoPageOverflow(page);
    if (viewport.label === 'small-phone' || viewport.label === 'wide-desktop') {
      await info.attach(`tour-${viewport.label}`, { body: await page.screenshot(), contentType: 'image/png' });
    }
  });

  test(`home/catalog do not overflow at ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockApi(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/costa rica/i);
    await expectNoPageOverflow(page);
    await page.goto('/tours');
    await expect(page.locator('.modern-card').first()).toBeVisible();
    await expectNoPageOverflow(page);
  });
}

for (const viewport of VIEWPORTS.filter(p => ['small-phone', 'tablet', 'wide-desktop'].includes(p.label))) {
  test(`map can be navigated at ${viewport.label} without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockApi(page);
    await page.goto('/map');
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expectNoPageOverflow(page);
    const map = page.locator('#costa-rica-leaflet-map-canvas');
    await expect(map).toBeVisible();
  });
}
