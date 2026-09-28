import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const flight = read('src/components/FlightBookingModal.tsx');
const mapService = read('src/components/MapServiceBookingModal.tsx');

for (const [name, source] of [['flight', flight], ['map service', mapService]] as const) {
  test(`${name} booking client never writes the authoritative Firestore bookings ledger`, () => {
    assert.doesNotMatch(source, /from ['"]firebase\/firestore['"]/);
    assert.doesNotMatch(source, /addDoc\s*\(/);
    assert.doesNotMatch(source, /collection\s*\(\s*db\s*,\s*['"]bookings['"]\s*\)/);
  });

  test(`${name} booking client requires an authoritative backend booking before success UI`, () => {
    assert.match(source, /const bookingRes = await fetch\(['"]\/api\/bookings['"]/);
    assert.match(source, /!bookingRes\.ok/);
    assert.match(source, /!bookingResult\?\.booking/);
    assert.match(source, /authoritativeBooking = bookingResult\.booking/);
  });
}

test('flight request never fabricates paid/confirmed state or a client PNR', () => {
  assert.match(flight, /paymentStatus:\s*['"]pending['"]/);
  assert.match(flight, /status:\s*['"]solicitada['"]/);
  assert.doesNotMatch(flight, /paymentStatus:[^\n]*['"]completed['"]/);
  assert.doesNotMatch(flight, /status:\s*['"]confirmada['"]/);
  assert.doesNotMatch(flight, /pnrLocator\s*:/);
  assert.doesNotMatch(flight, /phone:\s*phone\s*\|\|/);
});

test('flight payment redirect fails closed when Stripe does not return a valid session URL', () => {
  assert.match(flight, /!stripeRes\.ok/);
  assert.match(flight, /!stripeData\.url/);
  const catchBlock = flight.match(/catch \(err: any\) \{([\s\S]*?)\n    \} finally/)?.[1] || '';
  assert.doesNotMatch(catchBlock, /setShowSuccessTicket\(true\)/);
  assert.doesNotMatch(catchBlock, /onBookingSuccess\(/);
});

test('map service request never fabricates a confirmed booking on backend failure', () => {
  assert.match(mapService, /status:\s*['"]solicitada['"]/);
  assert.match(mapService, /paymentStatus:\s*['"]pending['"]/);
  assert.doesNotMatch(mapService, /status:\s*['"]confirmada['"]/);
  const catchBlock = mapService.match(/catch \(error: any\) \{([\s\S]*?)\n    \} finally/)?.[1] || '';
  assert.doesNotMatch(catchBlock, /setIsConfirmed\(true\)/);
  assert.doesNotMatch(catchBlock, /onBookingSuccess\(/);
});

test('booking UI does not claim confirmation or an official voucher before verification', () => {
  for (const source of [flight, mapService]) {
    assert.doesNotMatch(source, /¡Reserva Confirmada!/);
    assert.doesNotMatch(source, /Booking Confirmed!/);
    assert.doesNotMatch(source, /Booking Confirmed Successfully!/);
    assert.doesNotMatch(source, /voucher oficial/i);
  }
});
