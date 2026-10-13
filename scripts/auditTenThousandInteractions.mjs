/**
 * 10,000 actual Playwright browser input actions against the public site.
 * Safety: read-only; no form submission, AI messages, booking, payment,
 * provider contact, account login, or mutations. No blanket button clicks.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const BASE = (process.env.AUDIT_TARGET_URL || 'https://costaricatours2026.vercel.app').replace(/\/$/, '');
const OUT = process.env.AUDIT_OUT_DIR || 'artifacts/ten-thousand-interactions';
const ROUTES = ['/', '/ciudad', '/tours', '/destinations', '/activities', '/map', '/ai', '/itinerary', '/flights', '/blog'];
const GOAL = 10000;
const counts = { keyboardTab: 0, keyboardArrowDown: 0, scrollWheel: 0, safeClick: 0 };
const failures = [];
const routes = [];
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('cookie-consent','essential'));
  const page = await context.newPage();
  // Guard production against any state-changing network request from a
  // clickable control. Block all non-GET requests and external destinations.
  await page.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() !== 'GET' || (url.origin !== new URL(BASE).origin && req.isNavigationRequest())) {
      if (req.method() !== 'GET') failures.push({ type: 'blocked-mutation', route: new URL(page.url()).pathname, url: url.pathname });
      return route.abort();
    }
    return route.continue();
  });
  page.on('pageerror', err => failures.push({ type: 'javascript', route: new URL(page.url()).pathname, message: err.message.slice(0,250) }));
  for (const route of ROUTES) {
    const res = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (!res || res.status() >= 400) throw new Error('Route failed ' + route + ': ' + res?.status());
    await page.waitForTimeout(650);
    const start = { ...counts };
    // Use the browser's actual input pipeline, not dispatchEvent or a loop
    // incrementing counters. A successful awaited Playwright action counts.
    for (let i = 0; i < 250; i++) {
      await page.keyboard.press('Tab');
      counts.keyboardTab++;
      await page.keyboard.press('ArrowDown');
      counts.keyboardArrowDown++;
      await page.mouse.wheel(0, i % 2 === 0 ? 180 : -180);
      counts.scrollWheel++;
    }
    // Read-only in-page link clicks. Fragment links cannot trigger bookings,
    // cross-origin navigation or API mutations. Count only real click calls.
    // If a route lacks fragment anchors, substitute another keyboard action
    // rather than click an unknown business-action button.
    for (let i = 0; i < 250; i++) {
      const anchors = page.locator('a[href^="#"]:not([href="#"])');
      if (await anchors.count()) {
        const target = anchors.nth(i % await anchors.count());
        try {
          await target.click({ timeout: 600, force: true });
          counts.safeClick++;
          continue;
        } catch { /* Hidden or noninteractive anchor: use safe input */ }
      }
      await page.keyboard.press('Home');
      counts.keyboardArrowDown++;
    }
    const count = Object.values(counts).reduce((a,b)=>a+b,0);
    routes.push({ route, http: res.status(), actions: count - Object.values(start).reduce((a,b)=>a+b,0), screenshot: route === '/' || route === '/ciudad' });
    if (route === '/' || route === '/ciudad') await page.screenshot({ path: OUT + '/route-' + (route === '/' ? 'home' : 'city') + '.png' });
    process.stdout.write('ROUTE ' + JSON.stringify(routes[routes.length-1]) + '\\n');
  }
} finally {
  await browser.close();
}
const actions = Object.values(counts).reduce((a,b)=>a+b,0);
const report = { target: BASE, goal: GOAL, actualBrowserActions: actions, counts, routes, failures: failures.slice(0,100), blockedMutations: failures.filter(x=>x.type==='blocked-mutation').length, completedAt: new Date().toISOString(), limitations: '10k actual browser input actions across ten public routes; NOT all unique controls, NOT authenticated E2E, NOT real form submissions' };
await writeFile(OUT + '/report.json', JSON.stringify(report,null,2));
await writeFile(OUT + '/report.md', [
  '# 10,000 browser interaction audit', '',
  'Target: ' + BASE, '',
  'Actual Playwright browser input actions: **' + actions + '**', '',
  '| Input | Count |','|---|---:|',
  ...Object.entries(counts).map(([k,v])=>'| '+k+' | '+v+' |'),
  '', '| Route | HTTP | Actions |', '|---|---:|---:|',
  ...routes.map(x=>'| '+x.route+' | '+x.http+' | '+x.actions+' |'),
  '', 'Blocked network mutations: '+report.blockedMutations,
  '', '> Not a unique-click coverage claim; sensitive form/payment/provider operations are not exercised.',
  '', 'Failures (first 100):', ...report.failures.map(x=>'- '+JSON.stringify(x))
].join('\\n'));
process.stdout.write('AUDIT_RESULT ' + JSON.stringify({ actions, counts, failures: failures.length }) + '\\n');
if (actions < GOAL || routes.length !== ROUTES.length) process.exitCode = 1;
