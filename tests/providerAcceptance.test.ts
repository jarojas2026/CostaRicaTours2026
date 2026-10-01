import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptProviderOrder, providerAcceptancePatch } from '../backend/providerAcceptance';
import { bookingInquiry } from '../src/utils/bookingInquiry';

const order = { id: 'order-test', bookingId: 'booking-test', providerId: 'provider-test', status: 'dispatched' };
const booking = { providerId: 'provider-test', status: 'provider_pending', paymentStatus: 'completed' };
test('provider acceptance confirms only with verified payment and eligible lifecycle', () => {
  assert.equal(providerAcceptancePatch(booking, order, 'provider-test', 'now').status, 'confirmed');
  assert.equal(providerAcceptancePatch({ ...booking, status: 'payment_pending', paymentStatus: 'pending' }, order, 'provider-test', 'now').status, undefined);
  for (const status of ['cancelled', 'refunded', 'completed', 'in_operation']) assert.throws(() => providerAcceptancePatch({ ...booking, status }, order, 'provider-test', 'now'));
  assert.throws(() => providerAcceptancePatch(booking, order, 'other-provider', 'now'));
  assert.throws(() => providerAcceptancePatch({ ...booking, serviceOrderId: 'new-order' }, order, 'provider-test', 'now'));
});
test('acceptance writes both documents in a transaction and fails on persistence failure', async () => {
  const writes: any[] = [];
  const db = { collection: (collection: string) => ({ doc: (id: string) => ({ collection, id }) }), runTransaction: async (fn: any) => fn({
    get: async (ref: any) => ({ exists: true, id: ref.id, data: () => ref.collection === 'bookings' ? booking : order }),
    update: (ref: any, data: any) => writes.push({ ref, data }),
  }) };
  await acceptProviderOrder(db, order.id, 'provider-test', {});
  assert.equal(writes.length, 2);
  assert.equal(writes[1].data.status, 'confirmed');
  await assert.rejects(acceptProviderOrder({ ...db, runTransaction: async () => { throw new Error('storage unavailable'); } }, order.id, 'provider-test', {}), /storage unavailable/);
  await assert.rejects(acceptProviderOrder(null, order.id, 'provider-test', {}));
});
test('WhatsApp fallback preserves family details without claiming payment or confirmation', () => {
  const message = bookingInquiry({ language: 'es', tour: 'Bosque & playa', date: '2026-12-10', adults: 2, children: 2, pickup: 'Por definir' });
  assert.match(message, /Adultos: 2\nNiños: 2/);
  assert.match(message, /comprobar si ya existe/);
  assert.match(message, /no confirma reserva ni pago/);
});
