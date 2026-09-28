import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const bookingService = readFileSync(new URL('../backend/bookingService.ts', import.meta.url), 'utf8');
const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

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
