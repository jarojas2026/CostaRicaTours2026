import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const bookingService = readFileSync(new URL('../backend/bookingService.ts', import.meta.url), 'utf8');
const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('legacy customer approval route cannot stand in for provider confirmation', () => {
  assert.match(server, /\/api\/bookings\/:id\/customer-confirm/);
  assert.match(bookingService, /toLifecycle === 'confirmed' && updates\.customerConfirmedAt/);
  assert.match(bookingService, /hasProviderConfirmationEvidence\(existing, updates\)/);
});

test('customer approval guard explicitly explains provider confirmation requirement', () => {
  assert.match(
    bookingService,
    /la reserva no puede confirmarse hasta recibir evidencia de confirmación del proveedor/i
  );
});

test('legacy GET confirmation endpoint is retired and cannot change payment state', () => {
  const legacyRoute = server.match(/app\.all\('\/api\/bookings\/:id\/customer-confirm'[\s\S]*?\n\}\);/)?.[0] || '';
  assert.match(legacyRoute, /status\(410\)/);
  assert.doesNotMatch(legacyRoute, /updateBookingStatus|status:\s*['"]pagada['"]/);
});

test('payment returns validate provider references and never fabricate a booking in the UI', () => {
  assert.match(server, /client_reference_id: booking\.bookingId/);
  assert.match(server, /metadata: \{ bookingId: booking\.bookingId \}/);
  assert.match(server, /custom_id: booking\.bookingId/);
  assert.match(server, /app\.post\('\/api\/payments\/stripe\/return'/);
  assert.match(server, /session\.payment_status !== 'paid'/);
  assert.match(server, /app\.post\('\/api\/payments\/paypal\/return'/);
  assert.doesNotMatch(app, /bookingId:\s*["']VERIFICANDO/);
  assert.match(app, /\/api\/payments\/stripe\/return/);
  assert.match(app, /\/api\/payments\/paypal\/return/);
});
