import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/components/TourDetailModal.tsx'), 'utf8');

test('tour booking waits for provider evidence before Stripe or PayPal', () => {
  const waitIndex = source.indexOf('await waitForProviderResponse(bookingId)');
  const paymentIndex = source.indexOf('await continueToOnlinePayment(bookingId)');
  assert.ok(waitIndex > 0, 'provider polling must exist');
  assert.ok(paymentIndex > waitIndex, 'online payment must occur after provider polling');
  assert.match(source, /providerResult !== 'confirmed'/);
});

test('pending provider response never creates a duplicate booking', () => {
  assert.match(source, /let bookingId = pendingBookingId/);
  assert.match(source, /if \(!bookingId\)/);
  assert.match(source, /setPendingBookingId\(bookingId\)/);
  assert.match(source, /Revisar respuesta del proveedor/);
});

test('UI clearly promises no charge before availability', () => {
  assert.match(source, /No se realizará ningún cobro hasta confirmar disponibilidad/);
  assert.match(source, /Sin cobro antes de disponibilidad/);
  assert.match(source, /No realices la transferencia todavía/);
});
