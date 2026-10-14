import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test as base, expect, type Page, type Route } from '@playwright/test';

const require = createRequire(import.meta.url);
// index.html loads Leaflet's CSS from unpkg with SRI; serving the identical local
// file keeps the integrity check (and the map layout) intact while offline.
const LEAFLET_CSS = readFileSync(require.resolve('leaflet/dist/leaflet.css'), 'utf8');

/** Booking id returned by the mocked POST /api/bookings. */
export const MOCK_BOOKING_ID = 'CRT-E2E-0001';

export interface MockApiOptions {
  /** Tour id offered by the mocked concierge as an in-chat booking quick action. */
  bookableTourId?: string;
}

interface ConsoleProblem {
  type: string;
  text: string;
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } });

/**
 * Offline API: every /api/** call is answered here so the smoke suite never
 * needs the Express backend, Firebase or real provider keys.
 */
export async function mockApi(page: Page, options: MockApiOptions = {}): Promise<{ bookingRequests: unknown[] }> {
  const bookingRequests: unknown[] = [];

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();

    if (pathname === '/api/chat/session' && method === 'POST') {
      return json(route, { success: true, sessionId: 'chat_e2e', sessionToken: 'e2e-token', expiresAt: Date.now() + 3_600_000 }, 201);
    }
    if (pathname === '/api/chat/history') return json(route, { success: true, messages: [] });
    if (pathname === '/api/gemini/concierge' || pathname === '/api/gemini/booking/urgent') {
      return json(route, {
        reply: 'Con gusto. Puedo registrar una solicitud de reserva para este tour.',
        modelUsed: 'e2e-mock',
        quickActions: options.bookableTourId
          ? [{ label: 'Solicitar reserva', action: 'book', data: { tourId: options.bookableTourId } }]
          : [],
      });
    }
    if (pathname === '/api/bookings' && method === 'POST') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      bookingRequests.push(payload);
      return json(route, {
        success: true,
        booking: {
          bookingId: MOCK_BOOKING_ID,
          status: 'pending_provider_confirmation',
          tourName: payload.tourName,
          date: payload.date,
          adults: payload.adults,
        },
      }, 201);
    }
    if (pathname === '/api/currency/exchange-rate') {
      return json(route, { usdToCrc: 510, source: 'runtime-config', updatedAt: new Date().toISOString() });
    }
    if (pathname.startsWith('/api/tours/') && pathname.endsWith('/media')) return json(route, { success: true, assets: [] });
    if (pathname.startsWith('/api/tours/') && pathname.endsWith('/availability')) {
      return json(route, { available: false, status: 'pending_provider_confirmation', slots: [] });
    }
    // Anything else: a neutral, successful empty payload.
    return json(route, method === 'GET' ? {} : { success: true });
  });

  return { bookingRequests };
}

/**
 * Third-party traffic (Firebase, Google Maps, map tiles, fonts, analytics) is
 * answered with an empty response so the suite is hermetic and deterministic.
 */
export async function isolateThirdParties(page: Page, baseURL: string): Promise<void> {
  const origin = new URL(baseURL).origin;
  await page.route((url) => url.origin !== origin && !url.protocol.startsWith('data') && !url.protocol.startsWith('blob'), (route) => {
    const url = new URL(route.request().url());
    const type = route.request().resourceType();
    if (url.hostname === 'unpkg.com' && url.pathname.endsWith('/leaflet.css')) {
      return route.fulfill({ status: 200, contentType: 'text/css', body: LEAFLET_CSS, headers: { 'access-control-allow-origin': '*' } });
    }
    if (url.hostname === 'open.er-api.com') {
      return json(route, { result: 'success', base_code: 'USD', rates: { USD: 1, CRC: 510, EUR: 0.92 } });
    }
    if (type === 'image') {
      // 1×1 transparent PNG keeps <img> and Leaflet tiles from erroring.
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'),
      });
    }
    if (type === 'stylesheet') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    if (type === 'font') return route.fulfill({ status: 204, body: '' });
    return route.abort('blockedbyclient');
  });
}

/**
 * Console noise that comes from the hermetic network isolation itself (blocked
 * third-party requests), never from application code.
 */
const ISOLATION_NOISE: RegExp[] = [
  /^Failed to load resource: net::ERR_BLOCKED_BY_CLIENT/,
  /@firebase\//,
  /vendor-firebase-[\w-]+\.js/,
];

export const test = base.extend<{ consoleProblems: ConsoleProblem[] }>({
  // auto: every test is hermetic and collects console problems, even if it does not ask for them.
  consoleProblems: [async ({ page, baseURL }, use) => {
    const problems: ConsoleProblem[] = [];
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      if (ISOLATION_NOISE.some((pattern) => pattern.test(text))) return;
      problems.push({ type: 'console.error', text });
    });
    page.on('pageerror', (error) => problems.push({ type: 'pageerror', text: `${error.name}: ${error.message}` }));
    await isolateThirdParties(page, baseURL!);
    await use(problems);
  }, { auto: true }],
});

export function expectNoConsoleErrors(problems: ConsoleProblem[]): void {
  expect(problems, problems.map((problem) => `${problem.type}: ${problem.text}`).join('\n')).toEqual([]);
}

export { expect };
