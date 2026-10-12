/**
 * Browser-based read-only navigation audit.
 * NEVER submit forms, invoke payments, create bookings, send messages, accept
 * provider orders, or impersonate a logged-in user in this audit.
 *
 * TARGET_URL is a public deployment under test; default is production.
 * Runs from GitHub Actions where outbound HTTPS and headless Chromium exist.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = (process.env.AUDIT_TARGET_URL || 'https://costaricatours2026.vercel.app').replace(/\/$/, '');
const OUT = process.env.AUDIT_OUT_DIR || 'artifacts/navigation-audit';
const ALL_ROUTES = [
  '/', '/ciudad', '/participar', '/tours', '/destinations', '/activities',
  '/map', '/ai', '/trip', '/itinerary', '/flights', '/blog', '/about',
  '/culture', '/tools', '/counter', '/workspace', '/provider/portal',
  '/admin', '/admin/ai-command', '/admin/ai-architecture',
  '/admin/email-operations', '/admin/financial-legal', '/ops'
];
const MOBILE_ROUTES = [
  '/', '/ciudad', '/participar', '/tours', '/destinations',
  '/map', '/ai', '/trip', '/itinerary', '/flights'
];
const PROTECTED = new Set([
  '/admin', '/admin/ai-command', '/admin/ai-architecture',
  '/admin/email-operations', '/admin/financial-legal', '/ops',
  '/provider/portal'
]);
const MAX_ERRORS = 12;
await mkdir(OUT, { recursive: true });
const report = {
  target: BASE,
  startedAt: new Date().toISOString(),
  safety: 'READ ONLY: no customer submissions, provider actions or payment operations',
  routes: [],
  interactions: [],
  summary: {},
};
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

async function checkRoute(context, route, device) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => { if (errors.length < MAX_ERRORS) errors.push('pageerror: ' + e.message.slice(0,200)); });
  page.on('console', message => {
    if (message.type() === 'error' && errors.length < MAX_ERRORS) {
      errors.push('console: ' + message.text().slice(0,200));
    }
  });
  let responseStatus = null;
  let fatal = null;
  let details = {};
  try {
    const response = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    responseStatus = response?.status() ?? null;
    await page.waitForTimeout(1400);
    details = await page.evaluate(async () => {
      const heading = document.querySelector('h1,h2')?.textContent?.trim().slice(0,180) || '';
      const clickables = [...document.querySelectorAll('a[href],button,[role="button"],select,input[type="submit"]')];
      const links = [...document.querySelectorAll('a[href]')];
      const bodyLength = (document.body?.innerText || '').trim().length;
      const pageHeight = document.documentElement.scrollHeight;
      const invalidHrefs = links
        .map(a => a.getAttribute('href'))
        .filter(href => !href || href === '#' || /^javascript:/i.test(href));
      const hasHorizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 5;
      const forms = document.querySelectorAll('form').length;
      const max = Math.min(pageHeight, 16000);
      for (let offset = 0; offset < max; offset += Math.max(350, window.innerHeight * 0.7)) {
        window.scrollTo({ top: offset, behavior: 'instant' });
        await new Promise(resolve => setTimeout(resolve, 14));
      }
      window.scrollTo({ top: pageHeight, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 100));
      return { title: document.title, heading, bodyLength, clickables: clickables.length,
        links: links.length, invalidHrefs: invalidHrefs.slice(0,12), forms, pageHeight,
        hasHorizontalOverflow, reachedBottom: window.scrollY + window.innerHeight >= Math.min(pageHeight,document.documentElement.scrollHeight) - 8 };
    });
    if (['/', '/ciudad', '/participar', '/tours', '/ai'].includes(route) && device === 'desktop') {
      await page.screenshot({ path: join(OUT, 'desktop-' + (route === '/' ? 'home' : route.slice(1).replaceAll('/','-')) + '-bottom.png'), fullPage: false });
    }
  } catch (e) {
    fatal = String(e).slice(0,600);
  }
  const item = { route, device, responseStatus, ...details, jsErrors: errors, fatal,
    access: PROTECTED.has(route) ? 'requires-authenticated-testing' : 'public',
    outcome: fatal || responseStatus === null || responseStatus >= 500 || !details.bodyLength ? 'fail' : 'observed' };
  report.routes.push(item);
  process.stdout.write('PAGE ' + JSON.stringify(item).slice(0,450) + '\n');
  await page.close();
}

async function recordInteraction(context, label, url, action) {
  const page = await context.newPage();
  try {
    await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(1000);
    const details = await action(page);
    report.interactions.push({ label, result: 'observed', ...(details || {}) });
  } catch (e) {
    report.interactions.push({ label, result: 'failed', error: String(e).slice(0,420) });
  } finally {
    await page.close();
  }
}

// No click below is permitted to create/update a record, initiate a booking,
// send a chat/contact request, take a payment, or leave the host.
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' });
  for (const path of ALL_ROUTES) await checkRoute(desktop, path, 'desktop');
  for (const path of MOBILE_ROUTES) await checkRoute(mobile, path, 'mobile');

  await recordInteraction(desktop, 'city district select -> detail', '/ciudad', async page => {
    const buttons = page.getByRole('button', { name: /Ver en el plano|View on plan/ });
    if (await buttons.count() === 0) throw new Error('No district selection buttons');
    await buttons.nth(2).click();
    const pressed = await buttons.nth(2).getAttribute('aria-pressed');
    if (pressed !== 'true') throw new Error('District selection did not update aria-pressed');
    return { selected: 'third district', pressed };
  });
  await recordInteraction(desktop, 'city -> participate navigation', '/ciudad', async page => {
    await page.locator('a[href="/participar"]').first().click();
    await page.waitForURL('**/participar', { timeout: 15_000 });
    return { path: new URL(page.url()).pathname };
  });
  await recordInteraction(desktop, 'home quick catalog click', '/', async page => {
    const target = page.getByText('Catálogo de Tours', { exact: true }).first();
    await target.click({ timeout: 12_000 });
    await page.waitForURL('**/tours', { timeout: 12_000 });
    return { path: new URL(page.url()).pathname };
  });
  await recordInteraction(desktop, 'footer privacy dialog open/close', '/', async page => {
    const button = page.getByRole('button', { name: /Privacidad y Datos|Privacy \(MEIC\)/ }).first();
    await button.click({ timeout: 12_000 });
    const dialogs = page.locator('[role="dialog"],[aria-modal="true"]');
    const count = await dialogs.count();
    await page.keyboard.press('Escape');
    return { dialogCount: count };
  });
  await recordInteraction(desktop, 'empty participate form validation (no submit)', '/participar', async page => {
    const forms = await page.locator('form').count();
    return { forms, note: forms ? 'Only inspected, not submitted' : 'May require login to display application form' };
  });
  await recordInteraction(desktop, 'tour details read-only navigation', '/tours', async page => {
    const links = page.locator('a[href^="/tour/"]');
    const count = await links.count();
    if (!count) return { count, note: 'Tour cards may use onClick instead of anchor tags; requires investigation' };
    await links.first().click({ timeout: 10_000 });
    return { count, destination: new URL(page.url()).pathname };
  });
  await recordInteraction(mobile, 'mobile header menu toggle (no outbound click)', '/', async page => {
    const candidates = page.locator('button[aria-label*="men"],button[aria-label*="Men"],button[aria-label*="menu"],button[aria-label*="Menu"]');
    const count = await candidates.count();
    if (!count) return { count, note: 'Menu toggle requires manual role/name audit' };
    await candidates.first().click();
    return { count, expanded: await candidates.first().getAttribute('aria-expanded') };
  });
  await recordInteraction(desktop, 'floating chat open without sending', '/', async page => {
    const b = page.locator('button[aria-label*="WhatsApp Concierge"]');
    const count = await b.count();
    if (count) await b.first().click();
    return { count, note: 'Opened only; no AI request or WhatsApp action' };
  });
} finally {
  await browser.close();
}

report.finishedAt = new Date().toISOString();
report.summary = {
  routesVisited: report.routes.length,
  pagesFailed: report.routes.filter(x => x.outcome === 'fail').length,
  pagesNeedingAuthenticatedTests: report.routes.filter(x => x.access !== 'public').length,
  buttonsAndLinksObserved: report.routes.reduce((n,x) => n + (x.clickables || 0), 0),
  interactionsAttempted: report.interactions.length,
  interactionsFailed: report.interactions.filter(x => x.result === 'failed').length
};
await writeFile(join(OUT,'report.json'), JSON.stringify(report,null,2));
const lines = [
  '# Costa Rica Tours — read-only browser navigation audit',
  '',
  'Target: ' + BASE,
  'Started: ' + report.startedAt,
  'Finished: ' + report.finishedAt,
  '',
  '> Safety: no bookings, payment actions, provider replies, login, contact messages or data mutations.',
  '',
  '> This audit counts observable controls and exercises ONLY a limited set of safe interactions; it does NOT claim every button was clicked.',
  '',
  '## Route matrix',
  '',
  '| Device | Route | HTTP | Heading | Controls | Scroll bottom | JS errors | Access |',
  '|---|---|---:|---|---:|---|---:|---|',
  ...report.routes.map(x=>`| ${x.device} | ${x.route} | ${x.responseStatus ?? '—'} | ${String(x.heading||'—').replaceAll('|','/').slice(0,45)} | ${x.clickables??'—'} | ${x.reachedBottom ? 'yes' : 'no'} | ${x.jsErrors.length} | ${x.access} |`),
  '', '## Safe clicks',
  '',
  ...report.interactions.map(x=>`- ${x.result === 'observed' ? 'PASS' : 'FAIL'} — ${x.label}: ${x.error || JSON.stringify(x).slice(0,180)}`),
  '',
  '## Required manual/sandbox work',
  '',
  '1. Authenticated admin and provider actions with test identities (never production accounts).',
  '2. Booking through provider confirmation and sandbox checkout/payment webhooks.',
  '3. All controls beyond the safe click whitelist, keyboard and screen-reader review.',
  '4. Visual image correctness, network waterfall, WCAG, Spanish/English parity.',
  ''
];
await writeFile(join(OUT,'report.md'), lines.join('\n'));
process.stdout.write('AUDIT_SUMMARY ' + JSON.stringify(report.summary) + '\n');
if (report.summary.pagesFailed) process.exitCode = 1;
