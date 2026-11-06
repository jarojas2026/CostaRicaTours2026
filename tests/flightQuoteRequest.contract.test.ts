import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modal = readFileSync('src/components/FlightBookingModal.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');

test('flight quote extras are opt-in and default unchecked', () => {
  assert.match(modal, /includeAirportTransfer, setIncludeAirportTransfer\] = useState\(false\)/);
  assert.match(modal, /includeWelcomeSimKit, setIncludeWelcomeSimKit\] = useState\(false\)/);
  assert.match(modal, /includeTravelInsurance, setIncludeTravelInsurance\] = useState\(false\)/);
  assert.match(modal, /transferPrice = includeAirportTransfer \? 45 : 0/);
  assert.match(modal, /simKitPrice = includeWelcomeSimKit \? 15 : 0/);
  assert.match(modal, /insurancePrice = includeTravelInsurance \? 29 : 0/);
});

test('flight modal submits a quote request without card checkout or payment initiation', () => {
  assert.match(modal, /Request a quote|Solicitar cotización/);
  assert.match(modal, /fetch\('\/api\/bookings'/);
  // Stripe se conserva detrás de una bandera apagada (regla: no borrar código, desactivar).
  assert.match(modal, /export const FLIGHT_ONLINE_PAYMENT_ENABLED = false as boolean;/);
  assert.match(modal, /if \(FLIGHT_ONLINE_PAYMENT_ENABLED && paymentMethod === 'credit_card'\)/);
  assert.doesNotMatch(modal, /id: 'credit_card'/);
  assert.doesNotMatch(modal, /Credit Card|Tarjeta de crédito/i);
  assert.match(modal, /paymentMethod: 'pay_at_pickup'/);
  assert.match(modal, /status: 'solicitada'/);
});

test('flight quote displays itemized add-ons and never shows CRC zero when rate is unavailable', () => {
  assert.match(modal, /Base fare × passengers|Tarifa base × pasajeros/);
  assert.match(modal, /VIP driver × passengers|Chofer VIP × pasajeros/);
  assert.match(modal, /SIM ×/);
  assert.match(modal, /Insurance × passengers|Seguro × pasajeros/);
  assert.match(modal, /currency === 'CRC' && crcRate <= 0/);
  assert.match(modal, /CRC unavailable|CRC no disponible/);
  assert.doesNotMatch(modal, /₡\{totalCRC\.toLocaleString\(\)\}/);
});

test('flight tracker is not labelled as live when no live feed is established', () => {
  assert.match(app, /Radar de Vuelos/);
  assert.match(app, /Flight Radar/);
  assert.doesNotMatch(app, /Rastreador en Vivo de Vuelos|Live Flight Radar/);
});
