import { expect, expectNoConsoleErrors, mockApi, test } from './fixtures';

// #383: `vite preview` sirve los encabezados de vercel.json; ninguna página principal
// puede violar la CSP (un "Refused to load…" también falla por consola en el resto del suite).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (window === window.top) window.localStorage.setItem('cookie-consent', 'essential');
    (window as any).__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as any).__cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
});

test('preview sends the production security headers', async ({ page }) => {
  await mockApi(page);
  const response = await page.goto('/');
  const headers = response!.headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=(self)');
});

for (const path of ['/', '/tours', '/tour/arenal-hot-springs', '/map', '/ai']) {
  test(`no CSP violations on ${path}`, async ({ page, consoleProblems }) => {
    await mockApi(page);
    await page.goto(path);
    await page.waitForLoadState('networkidle').catch(() => undefined);
    const violations = await page.evaluate(() => (window as any).__cspViolations as string[]);
    expect(violations).toEqual([]);
    expectNoConsoleErrors(consoleProblems);
  });
}
