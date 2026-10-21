import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { minimizeCustomerName, toProviderPortalOrder } from '../backend/providerPortalView';

// Ley 8968: el portal del proveedor recibe solo datos mínimos para operar.

const order = {
  id: 'ord_1', bookingId: 'bk_1', tourId: 't1', tourName: 'Rafting Arenal', providerId: 'p1', providerName: 'Prov',
  date: '2026-11-02', time: '08:00', adults: 2, children: 1, pickupLocation: 'Hotel La Fortuna',
  status: 'confirmed', notes: 'Llevar ropa seca', language: 'en',
  customer: {
    name: 'María José Pérez Solís', email: 'maria@example.com', phone: '+50688881234',
    document: '1-1234-5678', passport: 'X123', address: 'San José, Barrio Escalante', history: [{ id: 'old' }],
    specialNeeds: 'Movilidad reducida', dietaryRestrictions: 'Vegana',
  },
};

const FORBIDDEN_KEYS = /"(email|phone|telefono|whatsapp|document|documentId|passport|cedula|address|history|bookings|payments?)"\s*:/i;

test('portal view never exposes email, phone, document, address or history', () => {
  for (const status of ['dispatched', 'confirmed', 'completed']) {
    const out = JSON.stringify(toProviderPortalOrder({ ...order, status }));
    assert.doesNotMatch(out, FORBIDDEN_KEYS, out);
    assert.doesNotMatch(out, /maria@example\.com|88881234|1-1234-5678|Escalante|Solís|Pérez/, out);
  }
});

test('portal view keeps the operational minimum', () => {
  const v = toProviderPortalOrder(order);
  assert.equal(v.customer.displayName, 'María S.');
  assert.equal(v.customer.language, 'en');
  assert.equal(v.customer.specialNeeds, 'Movilidad reducida');
  assert.equal(v.customer.dietaryRestrictions, 'Vegana');
  assert.equal(v.adults, 2);
  assert.equal(v.children, 1);
  assert.equal(v.date, '2026-11-02');
  assert.equal(v.pickupLocation, 'Hotel La Fortuna');
  assert.equal(v.notes, 'Llevar ropa seca');
  assert.deepEqual(Object.keys(v.customer).sort(), ['dietaryRestrictions', 'displayName', 'language', 'specialNeeds']);
});

test('name minimization', () => {
  assert.equal(minimizeCustomerName(''), 'Cliente');
  assert.equal(minimizeCustomerName('Ana'), 'Ana');
  assert.equal(minimizeCustomerName('  john   smith '), 'john S.');
});

test('GET /api/provider/portal route uses the minimized projection, not order.customer', () => {
  const src = fs.readFileSync(new URL('../backend/routes/provider.ts', import.meta.url), 'utf8');
  const portal = src.slice(src.indexOf("get('/api/provider/portal'"), src.indexOf("post('/api/provider/portal/action'"));
  assert.match(portal, /toProviderPortalOrder\(order\)/);
  assert.doesNotMatch(portal, /customer:\s*order\.customer/);
});
