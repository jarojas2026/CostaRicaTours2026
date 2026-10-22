import { expect, expectNoConsoleErrors, mockApi, test } from './fixtures';

const tourId = 'a-taste-of-aquiares-tour-de-cafe';

for (const width of [320, 375, 768, 1024, 1366, 1920]) {
  for (const language of ['es', 'en']) {
    test(`unobstructed contact navigation at ${width}px (${language})`, async ({ page, context, consoleProblems }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((lang) => {
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('crt_language', lang);
      }, language);
      await mockApi(page);
      // Never reach WhatsApp or send a real message: exercise only the browser link.
      await context.route('https://wa.me/**', route => route.fulfill({
        status: 200, contentType: 'text/html', body: '<h1>Offline WhatsApp draft</h1>',
      }));
      const intakeRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/customer-intake')) intakeRequests.push(request.url());
      });
      await page.goto('/tours');
      await expect(page.locator('.modern-card').first()).toBeVisible();
      await expect(page.getByRole('button', { name: /Abrir mostrador digital|Open digital counter|Abrir WhatsApp Concierge|Open Official WhatsApp/i })).toHaveCount(0);
      const footerLink = page.locator('footer').getByRole('link', { name: language === 'es' ? 'Consultar por WhatsApp' : 'Ask on WhatsApp', exact: true });
      await footerLink.scrollIntoViewIfNeeded();
      await expect(footerLink).toBeVisible();
      const popupPromise = page.waitForEvent('popup');
      await footerLink.click();
      const popup = await popupPromise;
      await expect(popup.getByRole('heading')).toHaveText('Offline WhatsApp draft');
      const draftUrl = new URL(popup.url());
      expect(draftUrl.hostname).toBe('wa.me');
      expect(draftUrl.searchParams.get('text')).toMatch(language === 'es' ? /no confirma/ : /does not confirm/);
      await popup.close();
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await page.goto(`/tour/${tourId}`);
      await expect(page.getByRole('heading', { level: 1 })).toContainText('A Taste of Aquiares');
      const helpLink = page.locator('a[aria-describedby="tour-whatsapp-hint"]');
      await helpLink.scrollIntoViewIfNeeded();
      await expect(helpLink).toHaveText(language === 'es' ? 'Consultar por WhatsApp' : 'Ask on WhatsApp');
      const tourDraft = new URL((await helpLink.getAttribute('href'))!);
      expect(tourDraft.searchParams.get('text')).toContain('A Taste of Aquiares');
      await helpLink.focus();
      await expect(helpLink).toBeFocused();
      const tourPopupPromise = page.waitForEvent('popup');
      await helpLink.press('Enter');
      const tourPopup = await tourPopupPromise;
      await expect(tourPopup.getByRole('heading')).toHaveText('Offline WhatsApp draft');
      await tourPopup.close();
      expect(intakeRequests).toEqual([]);
      expectNoConsoleErrors(consoleProblems);
    });
  }
}
