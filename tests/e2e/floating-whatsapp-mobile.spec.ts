import { expect, mockApi, test } from './fixtures';

test('public mobile shell keeps BottomNav clear and does not mount duplicate floating WhatsApp', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockApi(page);
  await page.goto('/');
  const nav = page.locator('div.fixed.bottom-3');
  await expect(nav).toBeVisible();
  // The app intentionally uses direct WhatsApp links; FloatingWhatsApp is not mounted in App.
  await expect(page.getByTestId('floating-whatsapp-launcher')).toHaveCount(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(5);
});

test('public desktop shell does not render the mobile BottomNav or floating WhatsApp', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockApi(page);
  await page.goto('/');
  await expect(page.locator('div.fixed.bottom-3')).toBeHidden();
  await expect(page.getByTestId('floating-whatsapp-launcher')).toHaveCount(0);
});
