import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deskCounterValue, deskRequest, hasDeskSnapshot } from '../src/utils/deskRequest';
import { bookingInquiry } from '../src/utils/bookingInquiry';

test('desk distinguishes unavailable data from a verified zero', () => {
  const snapshot = { counters: { totalBookings: 0, activeProviders: 4 }, upcoming: [], alerts: [] };
  assert.equal(hasDeskSnapshot({ snapshot }), true);
  for (const invalid of [null, {}, { snapshot: {} }, { snapshot: { ...snapshot, alerts: null } }]) {
    assert.equal(hasDeskSnapshot(invalid), false);
    assert.equal(deskCounterValue(invalid, 'totalBookings'), '—');
  }
  assert.equal(deskCounterValue({ snapshot }, 'totalBookings'), 0);
  assert.equal(deskCounterValue({ snapshot }, 'missing'), '—');
  for (const invalid of [-1, NaN, Infinity, '0']) {
    assert.equal(deskCounterValue({ snapshot: { ...snapshot, counters: { totalBookings: invalid } } }, 'totalBookings'), '—');
  }
  assert.equal(deskCounterValue({ snapshot: { ...snapshot, providerTruth: { sourceOfTruth: 'unavailable' } } }, 'activeProviders'), '—');
});

test('desk reads valid responses and does not retry failures or leak server errors', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ success: true, reply: 'Consulta recibida' })));
  assert.equal((await deskRequest('/api/counter/ask')).reply, 'Consulta recibida');
  for (const [status, language, expected] of [[401, 'es', /Inicia sesión/], [403, 'en', /cannot access/], [503, 'es', /no está verificado/]] as const) {
    fetchMock.mock.mockImplementation(async () => new Response('internal secret trace', { status }));
    const before = fetchMock.mock.callCount();
    await assert.rejects(deskRequest('/api/counter/organize', { method: 'POST' }, language), expected);
    assert.equal(fetchMock.mock.callCount() - before, 1);
  }
});

test('desk rejects invalid success payloads and interrupted requests', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('{}'));
  for (const payload of ['null', '[]', '"ok"', '{"success":false}', '<html>gateway</html>']) {
    fetchMock.mock.mockImplementation(async () => new Response(payload));
    await assert.rejects(deskRequest('/api/counter/autopilot'));
  }
  fetchMock.mock.mockImplementation(async (_url: any, init: any) => {
    assert.equal(init.signal.aborted, true);
    throw new DOMException('Aborted', 'AbortError');
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(deskRequest('/api/counter/ask', { signal: controller.signal }, 'en'), /Check its status before repeating/);
});

test('desk stops waiting after 30 seconds without replaying the request', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fetchMock = t.mock.method(globalThis, 'fetch', async (_url: any, init: any) => new Promise<Response>((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  const pending = deskRequest('/api/counter/organize', { method: 'POST' });
  const rejected = assert.rejects(pending, /Comprueba el estado antes de repetir/);
  t.mock.timers.tick(30000);
  await rejected;
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('family, solo and group handoffs retain details in ES and EN without confirmation', () => {
  for (const language of ['es', 'en']) for (const [adults, children] of [[2, 2], [1, 0], [12, 3]]) {
    const text = bookingInquiry({ language, tour: 'Bosque & playa', date: '2026-11-15', adults, children, pickup: 'PRUEBA QA: sin recogida real' });
    const url = new URL(`https://wa.me/50687959148?text=${encodeURIComponent(text)}`);
    assert.equal(url.searchParams.get('text'), text);
    assert.match(text, /2026-11-15/);
    assert.match(text, /PRUEBA QA: sin recogida real/);
    assert.ok(text.includes(`${language === 'es' ? 'Adultos' : 'Adults'}: ${adults}`));
    assert.ok(text.includes(`${language === 'es' ? 'Niños' : 'Children'}: ${children}`));
    assert.match(text, /no confirma reserva ni pago|does not confirm a booking or payment/);
  }
});

test('all desk WhatsApp entry points share the inquiry and availability is abortable', () => {
  const widget = readFileSync(new URL('../src/components/DigitalCounterWidget.tsx', import.meta.url), 'utf8');
  assert.equal((widget.match(/href=\{generateWhatsAppLink\(\)\}/g) || []).length, 2);
  assert.match(widget, /window.open\(generateWhatsAppLink\(\), '_blank', 'noopener,noreferrer'\)/);
  assert.match(widget, /bookingInquiry\(\{ language, tour: tourName, date: availDate, adults: availAdults, children: availChildren, pickup \}\)/);
  assert.match(widget, /if \(controller.signal.aborted\) return/);
  assert.doesNotMatch(widget, /Garantizamos reembolso del 100%/);
});

test('operations shortcuts call administrative functions and late session responses are guarded', () => {
  const page = readFileSync(new URL('../src/pages/CounterDeskPage.tsx', import.meta.url), 'utf8');
  assert.match(page, /action: organizeWithAI/);
  assert.match(page, /action: refresh/);
  assert.match(page, /onAuthStateChanged\(auth/);
  assert.match(page, /version !== sessionVersion.current/);
  assert.match(page, /version !== requestVersion.current/);
  assert.doesNotMatch(page, /counters\.totalBookings \?\? 0/);
});
