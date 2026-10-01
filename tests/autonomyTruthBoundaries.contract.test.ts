import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gateway = fs.readFileSync(path.join(root, 'api/gateway.ts'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');

test('legacy itinerary booking cannot publicly claim a confirmed reservation', () => {
  assert.match(gateway, /forwardedPath === 'itinerary\/book'/);
  assert.match(gateway, /legacy_itinerary_booking_retired/);
  assert.match(gateway, /state: 'proposal_only'/);
  assert.match(gateway, /verificar precio, disponibilidad, proveedor y pago/);
});

test('legacy agent availability aliases are routed to authoritative tour availability', () => {
  assert.match(gateway, /agent\/check-availability/);
  assert.match(gateway, /agent\/tools\/check_calendar_availability/);
  assert.match(gateway, /\/api\/tours\/\$\{encodeURIComponent\(tourId\)\}\/availability/);
  assert.match(gateway, /x-crt-availability-source/);
  assert.match(gateway, /authoritative-booking-service/);
});

test('availability adapter fails closed instead of inventing a generic tour or passenger count', () => {
  assert.match(gateway, /tour_id_required/);
  assert.match(gateway, /valid_target_date_required/);
  assert.match(gateway, /valid_party_size_required/);
  assert.doesNotMatch(gateway, /tour-general-costa-rica/);
});

test('customer-facing availability source remains checkTourAvailability', () => {
  assert.match(server, /app\.get\('\/api\/tours\/:id\/availability'/);
  assert.match(server, /checkTourAvailability\(\s*req\.params\.id,/);
});
