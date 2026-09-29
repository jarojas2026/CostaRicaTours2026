import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createBookingAttempt, requirePaymentUrl } from '../src/utils/bookingAttempt';

test('retries preserve the key; changed requests get another key', () => {
  const attempt = createBookingAttempt();
  const first = attempt({ date: '2027-01-01', adults: 2 });
  assert.equal(attempt({ date: '2027-01-01', adults: 2 }), first);
  assert.notEqual(attempt({ date: '2027-01-01', adults: 3 }), first);
});

test('payment requires a real HTTPS provider link', () => {
  for (const value of [undefined, '', 'javascript:alert(1)', 'https://checkout.stripe.com.evil.test', 'http://www.paypal.com']) {
    assert.throws(() => requirePaymentUrl(value));
  }
  assert.equal(requirePaymentUrl('https://checkout.stripe.com/c/pay/test'), 'https://checkout.stripe.com/c/pay/test');
  assert.equal(requirePaymentUrl('https://www.paypal.com/checkoutnow?token=test'), 'https://www.paypal.com/checkoutnow?token=test');
});

test('both tour forms require a persisted booking and guard payment redirects', () => {
  for (const file of ['src/pages/TourDetailPage.tsx', 'src/components/TourDetailModal.tsx']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /!bookingData\.booking\?\.bookingId/);
    assert.match(source, /Idempotency-Key/);
    assert.match(source, /requirePaymentUrl\(stripeData.url\)/);
    assert.match(source, /requirePaymentUrl\(paypalData.url\)/);
    assert.doesNotMatch(source, /status:.*confirmada/);
  }
});

test('request summary cannot guarantee a reservation or payment by method alone', () => {
  const source = fs.readFileSync('src/components/BookingConfirmationModal.tsx', 'utf8');
  assert.doesNotMatch(source, /Reserva Confirmada y Garantizada|Booking Confirmed & Guaranteed|Paid \(Confirmed\)|Paid \(PayPal Protected\)/);
  assert.match(source, /booking.paymentStatus === 'completed'/);
});
