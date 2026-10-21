import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import express from 'express';
import type { AddressInfo } from 'node:net';
import {
  CLIENT_FACING_TOOLS, redactAssistantReplyMiddleware, redactBusinessContactsText, redactToolResultForClient,
} from '../backend/assistantContactRedaction';
import { executeAgentTool } from '../backend/agentTools';

// El asistente nunca entrega al cliente contactos de negocios/proveedores; emergencias oficiales sí.

const LEAKS = /(\+?506[\s-]?)?\b[2-8]\d{3}[\s-]?\d{4}\b|@[a-z0-9-]+\.[a-z]{2,}|https?:\/\/(?!([a-z0-9-]+\.)*(go\.cr|sa\.cr))|wa\.me/i;

test('reply text: business phone, WhatsApp, email and website are redacted', () => {
  const text = [
    'Hotel Ejemplo: llama al +506 8888-1234 o WhatsApp https://wa.me/50688881234',
    'Escribe a reservas@hotelejemplo.com o visita https://www.hotelejemplo.com/tarifas',
    'Tour Rafting: 2479-1234, www.raftingarenal.cr',
  ].join('\n');
  const out = redactBusinessContactsText(text);
  assert.doesNotMatch(out, LEAKS, out);
  assert.match(out, /Hotel Ejemplo/);
  assert.match(out, /\[contacto gestionado por Costa Rica Tours\]/);
  assert.match(redactBusinessContactsText('Call 8888 1234', 'en'), /\[contact handled by Costa Rica Tours\]/);
});

test('reply text: official emergencies and government links are kept', () => {
  const text = [
    'En una emergencia llama al 911.',
    'Hospital Escalante Pradilla (CCSS): 2785-0700',
    'Reserva oficial SINAC: https://serviciosenlinea.sinac.go.cr',
    'Cruz Roja: 2233-7033',
  ].join('\n');
  assert.equal(redactBusinessContactsText(text), text);
});

test('dates, prices and durations are not mistaken for phones', () => {
  const text = 'Precio de referencia US$85 por persona (revisado 2026-10-19), 3 días, 4.5 h, 10/03/2027';
  assert.equal(redactBusinessContactsText(text), text);
});

test('nearest_services: business addresses/phones removed and location approximate; emergencies keep address', () => {
  const business = redactToolResultForClient('nearest_services', {
    success: true, group: 'hospedaje', emergencyNumber: '911',
    results: [{ name: 'Hotel X', type: 'hotel', address: 'Calle 5, casa 12', phone: '8888-1234', distanceKm: 1.2, location: { lat: 9.123456, lng: -83.654321 } }],
  }) as any;
  const r = business.results[0];
  assert.equal(r.address, undefined);
  assert.equal(r.phone, undefined);
  assert.deepEqual(r.location, { lat: 9.12, lng: -83.65, approximate: true });
  assert.equal(business.emergencyNumber, '911');

  const pharmacy = redactToolResultForClient('nearest_services', { group: 'salud', results: [{ name: 'Farmacia Y', type: 'Farmacia', address: '100 m sur del parque' }] }) as any;
  assert.equal(pharmacy.results[0].address, undefined);

  const emergency = redactToolResultForClient('nearest_services', { group: 'emergencia', results: [{ name: 'Delegación', type: 'Policía', address: 'Frente al parque', location: { lat: 9.123456, lng: -83.654321 } }] }) as any;
  assert.equal(emergency.results[0].address, 'Frente al parque');
  const hospital = redactToolResultForClient('nearest_services', { group: 'salud', results: [{ name: 'Hospital Z', type: 'Hospital', address: 'Centro' }] }) as any;
  assert.equal(hospital.results[0].address, 'Centro');
});

test('search_operator_tours and other knowledge tools drop contact keys at any depth', () => {
  const out = redactToolResultForClient('search_operator_tours', {
    tours: [{ id: 't1', title: 'Rafting', priceUSD: 85, operatorPhone: '88881234', website: 'https://op.cr', contacts: { email: 'a@b.cr' }, notes: 'Llamar al 8888-1234' }],
  }) as any;
  const json = JSON.stringify(out);
  assert.doesNotMatch(json, /operatorPhone|website|contacts|88881234|8888-1234|a@b\.cr/);
  assert.equal(out.tours[0].priceUSD, 85);
  for (const t of ['nearest_services', 'search_operator_tours', 'park_info', 'find_guides', 'search_tours']) assert.ok(CLIENT_FACING_TOOLS.has(t), t);
});

test('park_info keeps official SINAC links but drops non-official ones', () => {
  const out = redactToolResultForClient('park_info', { results: [
    { name: 'PN Manuel Antonio', booking: 'https://serviciosenlinea.sinac.go.cr', source: 'https://www.sinac.go.cr' },
    { name: 'Otro', booking: 'https://agencia-privada.com/reserva', source: 'https://blog.com' },
  ] }) as any;
  assert.equal(out.results[0].booking, 'https://serviciosenlinea.sinac.go.cr');
  assert.equal(out.results[1].booking, null);
  assert.equal(out.results[1].source, 'https://www.sinac.go.cr');
});

test('executeAgentTool applies the redaction to real data (nearest_services lodging, Uvita)', async () => {
  const res = await executeAgentTool('nearest_services', { lat: 9.155, lng: -83.736, kind: 'hospedaje', limit: 5 });
  for (const r of res.results || []) {
    assert.equal(r.address, undefined);
    if (r.location) assert.equal(r.location.approximate, true);
  }
  assert.doesNotMatch(JSON.stringify(res), LEAKS);
});

test('public assistant routes redact the reply on the server', async () => {
  const agents = fs.readFileSync('backend/routes/agents.ts', 'utf8');
  assert.match(agents, /post\('\/api\/gemini\/concierge', redactAssistantReplyMiddleware,/);
  assert.match(agents, /post\('\/api\/agent\/counter', redactAssistantReplyMiddleware,/);
  assert.match(fs.readFileSync('backend/routes/counter.ts', 'utf8'), /post\('\/api\/counter\/ask', counterLimiter, redactAssistantReplyMiddleware,/);

  const app = express();
  app.use(express.json());
  app.post('/t', redactAssistantReplyMiddleware, (_req, res) => { res.json({ reply: 'Hotel Ejemplo: +506 8888-1234, info@hotel.com. Emergencias: 911', success: true }); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  try {
    const r = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/t`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"language":"es"}' });
    const body = await r.json();
    assert.doesNotMatch(body.reply, LEAKS);
    assert.match(body.reply, /911/);
    assert.equal(body.success, true);
  } finally { server.close(); }
});
