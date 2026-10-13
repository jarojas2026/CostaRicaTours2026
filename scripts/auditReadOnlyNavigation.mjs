/**
 * Browser-based read-only navigation audit.
 * Customer-intake click checks use an in-browser mocked API response only.
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
  safety: 'READ ONLY: no customer submissions, provider actions or payment operations; AI contact requests are mocked',
  routes: [],
  interactions: [],
  summary: {},
  findings: [],
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
      const candidateNodes = [
        document.scrollingElement,
        document.body,
        document.getElementById('root'),
        ...document.querySelectorAll('main,section,[class*="overflow"],[role="main"]')
      ].filter(Boolean);
      const scrollOptions = [...new Set(candidateNodes)].map(node => ({
        node, distance: Math.max(0, node.scrollHeight - node.clientHeight),
        overflow: getComputedStyle(node).overflowY
      })).filter(item => item.distance > 50)
        .sort((a,b) => b.distance - a.distance);
      const scrollTarget = scrollOptions[0];
      const scrollDistance = scrollTarget?.distance || 0;
      const scrollContainer = scrollTarget
        ? (scrollTarget.node.id || scrollTarget.node.tagName.toLowerCase()) + ':' + scrollTarget.overflow
        : null;
      const invalidHrefs = links
        .map(a => a.getAttribute('href'))
        .filter(href => !href || href === '#' || /^javascript:/i.test(href));
      const hasHorizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 5;
      const forms = document.querySelectorAll('form').length;
      if (scrollTarget) {
        const max = Math.min(scrollTarget.distance, 30000);
        for (let offset = 0; offset < max; offset += Math.max(400, window.innerHeight * 0.7)) {
          scrollTarget.node.scrollTop = offset;
          await new Promise(resolve => setTimeout(resolve, 14));
        }
        scrollTarget.node.scrollTop = scrollTarget.node.scrollHeight;
      } else {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
      }
      await new Promise(resolve => setTimeout(resolve, 180));
      const reachedBottom = scrollTarget
        ? scrollTarget.node.scrollTop + scrollTarget.node.clientHeight >= scrollTarget.node.scrollHeight - 15
        : window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 15;
      return { title: document.title, heading, bodyLength, clickables: clickables.length,
        links: links.length, invalidHrefs: invalidHrefs.slice(0,12), forms, pageHeight,
        scrollContainer, scrollDistance, hasHorizontalOverflow, reachedBottom };
    });
    if (['/', '/ciudad', '/participar', '/tours', '/ai'].includes(route) && device === 'desktop') {
      await page.screenshot({ path: join(OUT, 'desktop-' + (route === '/' ? 'home' : route.slice(1).replaceAll('/','-')) + '-bottom.png'), fullPage: false });
    }
  } catch (e) {
    fatal = String(e).slice(0,600);
  }
  const item = { route, device, responseStatus, ...details, jsErrors: errors, fatal,
    access: PROTECTED.has(route) ? 'requires-authenticated-testing' : 'public',
    outcome: fatal || responseStatus === null || responseStatus >= 400 || !details.bodyLength ? 'fail' : 'observed' };
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
    report.interactions.push({ label, result: details?.skipped ? 'skipped' : 'observed', ...(details || {}) });
  } catch (e) {
    try {
      const slug = label.replace(/[^a-z0-9-]+/gi, '-').toLowerCase().slice(0,70);
      await page.screenshot({ path: join(OUT, 'failed-click-' + slug + '.png'), fullPage: false });
    } catch { /* screenshots must not prevent the report */ }
    report.interactions.push({ label, result: 'failed',
      atPath: new URL(page.url()).pathname,
      error: String(e).slice(0,2500) });
  } finally {
    process.stdout.write('INTERACTION ' + JSON.stringify(report.interactions[report.interactions.length - 1]) + '\\n');
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
  // Navigate first-time pages with the consent banner present; afterward use
  // an explicit, least-privilege consent fixture for non-consent click tests.
  const consentContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await recordInteraction(consentContext, 'cookie banner reject non-essential consent', '/', async page => {
    const reject = page.getByRole('button', { name: /Rechazar|Reject/ }).first();
    await reject.click({ timeout: 12_000 });
    const choice = await page.evaluate(() => localStorage.getItem('cookie-consent'));
    if (choice !== 'essential') throw new Error('Consent state was not persisted as essential');
    return { consent: choice };
  });
  await consentContext.close();
  await desktop.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
  await mobile.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));


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
  for (const path of ['/tours', '/map', '/flights', '/itinerary', '/ai']) {
    await recordInteraction(desktop, 'city -> ' + path + ' district link', '/ciudad', async page => {
      const link = page.locator('a[href="' + path + '"]').last();
      await link.click({ timeout: 12_000 });
      await page.waitForURL('**' + path, { timeout: 12_000, waitUntil: 'domcontentloaded' });
      return { path: new URL(page.url()).pathname };
    });
  }

  await recordInteraction(desktop, 'home quick catalog click', '/', async page => {
    // HomeQuickNav already wraps the card in a semantic React Router Link.
    // Target the actual anchor, not its heading, and allow query parameters.
    const target = page.locator('a[href="/tours"]').filter({ hasText: /Catálogo de Tours|Tours & Adventures/ }).first();
    await target.waitFor({ state: 'visible', timeout: 12_000 });
    await target.click({ timeout: 12_000 });
    await page.waitForURL(url => url.pathname === '/tours', { timeout: 12_000 });
    return { path: new URL(page.url()).pathname };
  });
  await recordInteraction(desktop, 'footer category link keeps catalog filter', '/', async page => {
    const link = page.locator('footer a[href="/tours?category=canopy"]').first();
    await link.click({ timeout: 12_000 });
    await page.waitForURL(url => url.pathname === '/tours' && url.searchParams.get('category') === 'canopy', { timeout: 12_000 });
    await page.waitForTimeout(800);
    const category = new URL(page.url()).searchParams.get('category');
    if (category !== 'canopy') throw new Error('Footer category filter was replaced after route hydration');
    return { category, path: new URL(page.url()).pathname, note: 'No booking or provider request sent' };
  });

  await recordInteraction(desktop, 'catalog category click, back-forward and deep-link persistence', '/tours?category=wildlife&region=osa', async page => {
    await page.waitForTimeout(900);
    let current = new URL(page.url());
    if (current.searchParams.get('category') !== 'wildlife' || current.searchParams.get('region') !== 'osa') {
      throw new Error('Initial deep link was replaced: ' + current.search);
    }
    const categoryChip = page.getByRole('button', { name: /Volcanes y Termales|Volcanoes & Hot Springs/i }).first();
    await categoryChip.click({ timeout: 12_000 });
    await page.waitForURL(url => url.pathname === '/tours' && url.searchParams.get('category') === 'volcanoes', { timeout: 12_000 });
    current = new URL(page.url());
    if (current.searchParams.get('region') !== 'osa') throw new Error('Changing category erased the region filter');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    current = new URL(page.url());
    if (current.searchParams.get('category') !== 'wildlife' || current.searchParams.get('region') !== 'osa') {
      throw new Error('Browser back did not restore the shared filters');
    }
    return { original: 'wildlife+osa', changed: 'volcanoes+osa', restored: current.search, noNetworkMutations: true };
  });

  // These tests STUB the AI intake endpoint inside Chromium. They must never
  // contact production providers, send messages, create journeys or persist data.
  for (const entry of [
    { label: 'header assistance AI-first handoff', selector: 'header button', text: /Consulta por IA|AI inquiry/i, source: 'header:assistance' },
    { label: 'footer assistance AI-first handoff', selector: 'footer button', text: /Consultar por IA|Ask AI/i, source: 'footer:assistance' }
  ]) {
    await recordInteraction(desktop, entry.label + ' (network mocked)', '/', async page => {
      let intercepted = null;
      await page.route('**/api/customer-intake', async route => {
        intercepted = route.request().postDataJSON();
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({
            customer: { reply: 'TEST FIXTURE — simulated AI response; no request saved.' },
            decision: { escalated: false }, intakeId: 'TEST-MOCK-INTAKE'
          })
        });
      });
      const candidate = page.locator(entry.selector).filter({ hasText: entry.text }).first();
      await candidate.click({ timeout: 12_000 });
      await page.getByRole('dialog').first().waitFor({ timeout: 12_000 });
      await page.getByText('TEST FIXTURE — simulated AI response; no request saved.').waitFor({ timeout: 12_000 });
      if (intercepted?.source !== entry.source) throw new Error('Missing AI-first intake context: ' + JSON.stringify(intercepted));
      if (!intercepted?.message) throw new Error('AI intake was invoked with no customer message');
      return { requestSource: intercepted.source, networkMocked: true, providerMessagesSent: false };
    });
  }

  await recordInteraction(desktop, 'footer privacy dialog open/close', '/', async page => {
    const button = page.locator('footer button').filter({ hasText: /Privacidad y Datos|Privacy/ }).first();
    await button.click({ timeout: 12_000 });
    const dialogs = page.locator('[role="dialog"],[aria-modal="true"]');
    await dialogs.first().waitFor({ timeout: 12_000 });
    const count = await dialogs.count();
    await page.keyboard.press('Escape');
    await dialogs.first().waitFor({ state: 'hidden', timeout: 8_000 });
    return { dialogCount: count, closedWithEscape: true };
  });
  await recordInteraction(desktop, 'empty participate form validation (no submit)', '/participar', async page => {
    const forms = await page.locator('form').count();
    return { forms, skipped: true, note: forms ? 'Only inspected, not submitted' : 'Requires login to display application form' };
  });
  await recordInteraction(desktop, 'tour details read-only navigation', '/tours', async page => {
    const links = page.locator('a[href^="/tour/"]');
    const count = await links.count();
    if (!count) return { count, skipped: true, note: 'Tour cards may use onClick instead of anchor tags; requires investigation' };
    await links.first().click({ timeout: 10_000 });
    return { count, destination: new URL(page.url()).pathname };
  });
  await recordInteraction(mobile, 'mobile header menu toggle (no outbound click)', '/', async page => {
    const candidates = page.locator('button[aria-label*="men"],button[aria-label*="Men"],button[aria-label*="menu"],button[aria-label*="Menu"]');
    const count = await candidates.count();
    if (!count) return { count, skipped: true, note: 'Menu toggle requires manual role/name audit' };
    await candidates.first().click();
    return { count, expanded: await candidates.first().getAttribute('aria-expanded') };
  });
  await recordInteraction(desktop, 'floating chat open without sending', '/', async page => {
    const b = page.locator('button[aria-label*="WhatsApp Concierge"]');
    const count = await b.count();
    if (count) await b.first().click();
    return { count, skipped: !count, note: 'Opened only; no AI request or WhatsApp action' };
  });
} finally {
  await browser.close();
}

// Actionable evidence, separate from the limited pass/fail gate. This is NOT a
// claim that every control was exercised or that any real booking was created.
for (const route of report.routes) {
  const where = { route: route.route, device: route.device };
  if (route.outcome === 'fail') report.findings.push({ severity: 'critical', kind: 'route-failed', ...where, evidence: route.fatal || 'HTTP ' + route.responseStatus, reproduce: 'Navigate to ' + BASE + route.route + ' using ' + route.device + ' viewport' });
  if (route.jsErrors.length) report.findings.push({ severity: 'medium', kind: 'browser-errors', ...where, evidence: route.jsErrors, reproduce: 'Open browser console on ' + BASE + route.route });
  if (route.invalidHrefs?.length) report.findings.push({ severity: 'medium', kind: 'invalid-links', ...where, evidence: route.invalidHrefs, reproduce: 'Inspect anchors on ' + BASE + route.route });
  if (route.hasHorizontalOverflow) report.findings.push({ severity: 'medium', kind: 'horizontal-overflow', ...where, evidence: 'Document exceeds viewport width', reproduce: 'Open ' + BASE + route.route + ' at ' + route.device + ' viewport' });
  if (route.scrollDistance > 50 && !route.reachedBottom) report.findings.push({ severity: 'medium', kind: 'scroll-unreachable', ...where, evidence: route.scrollContainer || 'document', reproduce: 'Scroll to the bottom of ' + BASE + route.route });
}
for (const action of report.interactions.filter(item => item.result === 'failed')) {
  report.findings.push({ severity: 'high', kind: 'interaction-failed', label: action.label, route: action.atPath || 'unknown', evidence: action.error, reproduce: 'Repeat the safe interaction: ' + action.label });
}

report.finishedAt = new Date().toISOString();
report.summary = {
  routesVisited: report.routes.length,
  findingsCritical: report.findings.filter(x => x.severity === 'critical').length,
  findingsHigh: report.findings.filter(x => x.severity === 'high').length,
  findingsMedium: report.findings.filter(x => x.severity === 'medium').length,
  pagesFailed: report.routes.filter(x => x.outcome === 'fail').length,
  httpErrors: report.routes.filter(x => x.responseStatus !== null && x.responseStatus >= 400).length,
  scrollablePages: report.routes.filter(x => x.scrollDistance > 0).length,
  pagesNeedingAuthenticatedTests: report.routes.filter(x => x.access !== 'public').length,
  buttonsAndLinksObserved: report.routes.reduce((n,x) => n + (x.clickables || 0), 0),
  interactionsAttempted: report.interactions.length,
  interactionsFailed: report.interactions.filter(x => x.result === 'failed').length,
  interactionsSkipped: report.interactions.filter(x => x.result === 'skipped').length,
  interactionsObserved: report.interactions.filter(x => x.result === 'observed').length
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
  '> AI-first contact click checks return an explicitly labeled fixture inside Chromium; no real intake is dispatched.',
  '',
  '> This audit counts observable controls and exercises ONLY a limited set of safe interactions; it does NOT claim every button was clicked.',
  '',
  '## Prioritized findings',
  '',
  '| Severity | Device / route | Finding | Evidence | Reproduction |',
  '|---|---|---|---|---|',
  ...report.findings.map(x => '| ' + x.severity + ' | ' + [x.device || 'desktop', x.route].join(' / ').replaceAll('|','/') + ' | ' + x.kind + ' | ' + String(JSON.stringify(x.evidence) || '—').replaceAll('|','/').slice(0,180) + ' | ' + String(x.reproduce).replaceAll('|','/').slice(0,160) + ' |'),
  ...(report.findings.length ? [] : ['| — | — | No findings recorded in sampled checks | — | — |']),
  '',
  '## Route matrix',
  '',
  '| Device | Route | HTTP | Heading | Controls | Scroll distance | Bottom | JS errors | Access |',
  '|---|---|---:|---|---:|---:|---|---:|---|',
  ...report.routes.map(x=>`| ${x.device} | ${x.route} | ${x.responseStatus ?? '—'} | ${String(x.heading||'—').replaceAll('|','/').slice(0,45)} | ${x.clickables??'—'} | ${x.scrollDistance??'—'} | ${x.reachedBottom ? 'yes' : 'no'} | ${x.jsErrors.length} | ${x.access} |`),
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
if (report.summary.pagesFailed || report.summary.interactionsFailed) process.exitCode = 1;
