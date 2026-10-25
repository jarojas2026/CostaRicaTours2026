import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { describeLeadPaymentError, isValidBookingIdInput } from '../src/components/leadPaymentMessages';

test('bookingId: misma regla que el backend', () => {
  assert.equal(isValidBookingIdInput('BK_123-abc'), true);
  assert.equal(isValidBookingIdInput('  BK1  '), true);
  assert.equal(isValidBookingIdInput(''), false);
  assert.equal(isValidBookingIdInput('bad id'), false);
  assert.equal(isValidBookingIdInput('a'.repeat(81)), false);
});

test('errores conocidos: mensajes honestos, nunca "pagado"', () => {
  for (const code of ['lead_without_booking', 'stripe_live_blocked', 'checkout_unavailable', 'booking_not_found']) {
    const es = describeLeadPaymentError(409, { error: code }, true);
    const en = describeLeadPaymentError(409, { error: code }, false);
    assert.ok(es.length > 0 && en.length > 0);
    assert.doesNotMatch(es, /\bpagad[oa]\b/i);
    assert.doesNotMatch(en, /\bpaid\b/i);
  }
  assert.match(describeLeadPaymentError(503, { error: 'stripe_live_blocked' }, true), /TEST/);
});

test('sin permiso o servicio caído: mensaje claro', () => {
  assert.match(describeLeadPaymentError(403, {}, true), /dueño/);
  assert.match(describeLeadPaymentError(502, {}, false), /No charge/);
  assert.equal(describeLeadPaymentError(418, { message: 'x' }, true), 'x');
});

test('el panel usa solo los endpoints existentes y nunca marca pagado desde la UI', () => {
  const src = readFileSync(new URL('../src/components/LeadPaymentPanel.tsx', import.meta.url), 'utf8');
  for (const p of ["'link-booking'", "'payment-link'", "'payment-status'"]) assert.ok(src.includes(p), p);
  assert.doesNotMatch(src, /paymentStatus\s*[:=]\s*['"]completed['"]/);
  assert.doesNotMatch(src, /sk_live_|ALLOW_STRIPE_LIVE\s*=/);
  const page = readFileSync(new URL('../src/pages/LeadsPipelinePage.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes('<LeadPaymentPanel'), 'LeadsPipelinePage monta el panel');
});
