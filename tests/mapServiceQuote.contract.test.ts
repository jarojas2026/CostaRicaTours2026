import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { MAP_TOURISM_SERVICES } from '../src/data/mapServicesData';
import { TOURS } from '../src/data/toursData';
import {
  buildMapServiceQuoteLeadPayload, parseMapServiceQuoteLeadPayload, MAP_SERVICE_QUOTE_ENDPOINT, MAP_SERVICE_QUOTE_SOURCE,
} from '../shared/mapServiceQuoteRequest';
import { buildLeadRecord, buildMapServiceLeadInput } from '../backend/leadPipeline';

// Las consultas de servicios del mapa son leads de cotización, nunca reservas de /api/bookings.

const base = {
  serviceId: MAP_TOURISM_SERVICES[0].id, name: 'Ana Prueba', email: 'ana@example.com', phone: '+506 8888 8888',
  date: '2027-03-10', checkOutDate: '2027-03-12', adults: 2, children: 1, message: 'Hola', consent: true, language: 'es' as const,
};

test('map services are not catalog tours: their ids would fail /api/bookings', () => {
  const tourIds = new Set(TOURS.map(t => t.id));
  for (const s of MAP_TOURISM_SERVICES) assert.ok(!tourIds.has(s.id), s.id);
});

test('modal posts to the leads endpoint with consent + antiabuse, never /api/bookings', () => {
  const src = fs.readFileSync('src/components/MapServiceBookingModal.tsx', 'utf8');
  assert.doesNotMatch(src, /fetch\(\s*['"`]\/api\/bookings/);
  assert.match(src, /fetch\(MAP_SERVICE_QUOTE_ENDPOINT/);
  assert.match(src, /formGuardFields\(startedAt, ?honeypot\)/);
  assert.match(src, /<HoneypotField /);
  assert.match(src, /Ley 8968/);
  assert.match(src, /data-testid="map-service-quote-reference"/);
  assert.equal(MAP_SERVICE_QUOTE_ENDPOINT, '/api/leads/map-service-request');
  const route = fs.readFileSync('backend/routes/leads.ts', 'utf8');
  assert.match(route, /post\('\/api\/leads\/map-service-request', chatLimiter, quoteRequestGuard, quoteRequestDailyGuard,/);
});

test('payload requires Ley 8968 consent and valid contact', () => {
  assert.deepEqual(buildMapServiceQuoteLeadPayload({ ...base, consent: false }), { ok: false, error: 'consent_required' });
  assert.deepEqual(buildMapServiceQuoteLeadPayload({ ...base, email: 'x' }), { ok: false, error: 'email_invalid' });
  assert.deepEqual(buildMapServiceQuoteLeadPayload({ ...base, adults: 0 }), { ok: false, error: 'people_invalid' });
  assert.deepEqual(parseMapServiceQuoteLeadPayload({ source: 'tour_page' }), { ok: false, error: 'source_invalid' });
  const built = buildMapServiceQuoteLeadPayload(base);
  assert.ok(built.ok);
  if (built.ok) assert.equal(built.payload.source, MAP_SERVICE_QUOTE_SOURCE);
});

test('every map service id is accepted by the contract and builds a lead without an invented price', () => {
  for (const s of MAP_TOURISM_SERVICES) {
    const built = buildMapServiceQuoteLeadPayload({ ...base, serviceId: s.id });
    assert.ok(built.ok, s.id);
    if (!built.ok) continue;
    const input = buildMapServiceLeadInput(built.payload, s);
    assert.equal(input.source, 'map_service');
    assert.equal(input.referenceQuote, undefined, `${s.id}: sin precio de referencia inventado`);
    const record = buildLeadRecord(input);
    assert.equal(record.consent.dataProcessing, true);
    assert.equal(record.request.people, 3);
  }
});

test('POST /api/leads/map-service-request → 202 with CRT-XXXXXXXX reference; unknown service → 404', async () => {
  const { leadsRouter } = await import('../backend/routes/leads');
  const app = express();
  app.use(express.json());
  app.use(leadsRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}${MAP_SERVICE_QUOTE_ENDPOINT}`;
  const post = (body: unknown) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const built = buildMapServiceQuoteLeadPayload(base);
    assert.ok(built.ok);
    if (!built.ok) return;
    const guard = { website: '', formStartedAt: Date.now() - 10_000 };
    const ok = await post({ ...built.payload, ...guard });
    const okBody = await ok.json();
    assert.equal(ok.status, 202, JSON.stringify(okBody));
    assert.equal(okBody.success, true);
    assert.match(okBody.reference, /^CRT-[A-Z0-9]{8}$/);
    assert.doesNotMatch(JSON.stringify(okBody), /ana@example\.com|8888/);

    const unknown = await post({ ...built.payload, serviceId: 'no-existe', ...guard });
    assert.equal(unknown.status, 404);
    const noConsent = await post({ ...built.payload, consent: false, ...guard });
    assert.equal(noConsent.status, 400);
  } finally {
    server.close();
  }
});
