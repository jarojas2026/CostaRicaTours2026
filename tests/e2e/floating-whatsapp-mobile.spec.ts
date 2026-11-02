import { expect, mockApi, test } from './fixtures';

test('floating WhatsApp is mobile-only and does not cover BottomNav at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockApi(page);
  await page.goto('/');
  const nav = page.getByTestId('bottom-nav');
  const whatsapp = page.getByTestId('floating-whatsapp-launcher');
  await expect(nav).toBeVisible();
  await expect(whatsapp).toBeVisible();

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
  await mockApi(page);
  await page.goto('/');
  await expect(page.getByTestId('floating-whatsapp-launcher')).toBeHidden();
  await expect(page.getByTestId('bottom-nav')).toBeHidden();
});
