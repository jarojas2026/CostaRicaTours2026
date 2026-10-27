import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const tourPage = readFileSync('src/pages/TourDetailPage.tsx', 'utf8');
const tourModal = readFileSync('src/components/TourDetailModal.tsx', 'utf8');
const flightModal = readFileSync('src/components/FlightBookingModal.tsx', 'utf8');

test('public tour booking UI offers request coordination only, not online payment methods', () => {
  assert.match(tourPage, /const \[paymentMethod, setPaymentMethod\] = useState<[^>]+>\('pay_at_pickup'\)/);
  assert.match(tourPage, /<option value="pay_at_pickup">\{language === 'es' \? 'Enviar solicitud y coordinar pago después'/);
  assert.doesNotMatch(tourPage, /<option value="credit_card"/);
  assert.doesNotMatch(tourPage, /<option value="paypal"/);
  assert.doesNotMatch(tourPage, /<option value="sinpe_movil"/);
});

test('tour modal does not render Stripe, PayPal or SINPE payment choices', () => {
  assert.match(tourModal, /const \[paymentMethod, setPaymentMethod\] = useState<[^>]+>\('pay_at_pickup'\)/);
  assert.match(tourModal, /<option value="pay_at_pickup"[^>]*>\{language === 'es' \? 'Enviar solicitud y coordinar pago después'/);
  assert.doesNotMatch(tourModal, /<option value="credit_card"/);
  assert.doesNotMatch(tourModal, /<option value="paypal"/);
  assert.doesNotMatch(tourModal, /<option value="sinpe_movil"/);
});

test('flight request UI defaults to no online charge and only renders that option', () => {
  assert.match(flightModal, /const \[paymentMethod, setPaymentMethod\] = useState<[^>]+>\('pay_at_pickup'\)/);
  assert.match(flightModal, /id: 'pay_at_pickup', label: language === 'es' \? 'Enviar solicitud sin cobro online'/);
  assert.doesNotMatch(flightModal, /id: 'credit_card'/);
  assert.doesNotMatch(flightModal, /id: 'sinpe_movil'/);
});
