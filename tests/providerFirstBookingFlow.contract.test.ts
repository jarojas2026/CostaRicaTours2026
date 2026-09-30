import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const lifecycle = fs.readFileSync(path.join(root, 'backend/reservationLifecycleOrchestrator.ts'), 'utf8');
const massiveEngine = fs.readFileSync(path.join(root, 'backend/massiveProcessingEngine.ts'), 'utf8');

test('payment-pending bookings dispatch to the provider before charging', () => {
  assert.match(lifecycle, /paymentPending\s*&&\s*!booking\.serviceOrderId/);
  assert.match(lifecycle, /prepayment-provider-dispatch/);
  assert.match(lifecycle, /dispatchServiceOrder\(\{/);
  assert.match(lifecycle, /providerStatus:\s*'pending'/);
  assert.match(lifecycle, /Consulta \$\{order\.id\} enviada al proveedor antes del cobro/);
});

test('provider confirmation before payment is evidence, not final booking confirmation', () => {
  assert.match(lifecycle, /paymentPending\s*&&\s*providerConfirmed/);
  assert.match(lifecycle, /providerStatus:\s*'confirmed'/);
  assert.match(lifecycle, /lifecycle:\s*'payment_pending'/);
  assert.match(lifecycle, /Proveedor confirmó disponibilidad; el pago puede solicitarse/);
});

test('final customer confirmation still requires paid/provider-confirmed lifecycle', () => {
  assert.match(lifecycle, /\['provider_pending', 'paid'\]\.includes\(status\)\s*&&\s*providerConfirmed/);
  assert.match(lifecycle, /executeCustomerBookingConfirmation/);
});

test('booking intake runs the canonical lifecycle immediately instead of waiting for cron', () => {
  assert.match(massiveEngine, /await import\('\.\/reservationLifecycleOrchestrator'\)/);
  assert.match(massiveEngine, /await advanceReservationLifecycle\(booking\)/);
  assert.doesNotMatch(massiveEngine, /deferredToCanonicalLifecycle:\s*true/);
});
