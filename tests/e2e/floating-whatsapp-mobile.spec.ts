import { expect, mockApi, test } from './fixtures';

// BottomNav no tiene data-testid (y no se modifica). El Header usa el mismo nombre accesible, así que
// se ubica por su contenedor fijo inferior (lg:hidden fixed bottom-3).
const bottomNav = (page: import('@playwright/test').Page) =>
  page.locator('div.lg\\:hidden.fixed.bottom-3 > nav');

test('floating WhatsApp is mobile-only and does not cover BottomNav at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => { if (window === window.top) localStorage.setItem('cookie-consent', 'essential'); });
  await mockApi(page);
  await page.goto('/');
  const nav = bottomNav(page);
  const whatsapp = page.getByTestId('mobile-whatsapp-button');
  await expect(nav).toBeVisible();
  await expect(whatsapp).toBeVisible();
  await expect(whatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\//);

  const [navBox, whatsappBox] = await Promise.all([nav.boundingBox(), whatsapp.boundingBox()]);
  expect(navBox).not.toBeNull();
  expect(whatsappBox).not.toBeNull();
  const overlaps = whatsappBox!.x < navBox!.x + navBox!.width
    && whatsappBox!.x + whatsappBox!.width > navBox!.x
    && whatsappBox!.y < navBox!.y + navBox!.height
    && whatsappBox!.y + whatsappBox!.height > navBox!.y;
  expect(overlaps, 'WhatsApp launcher must not overlap the BottomNav').toBe(false);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(5);
});

test('floating WhatsApp is hidden on desktop while BottomNav is also hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => { if (window === window.top) localStorage.setItem('cookie-consent', 'essential'); });
  await mockApi(page);
  await page.goto('/');
  await expect(page.getByTestId('mobile-whatsapp-button')).toBeHidden();
  await expect(bottomNav(page)).toBeHidden();
});
