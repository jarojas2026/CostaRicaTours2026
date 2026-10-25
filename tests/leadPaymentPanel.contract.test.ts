import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { classifyCheckoutUnavailable, describeLeadPaymentError, describeVoucherReason, isValidBookingIdInput } from '../src/components/leadPaymentMessages';

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

test('motivos del voucher: traducidos ES/EN, nunca el código crudo', () => {
  for (const code of ['estado_no_pagado', 'pago_no_verificado', 'monto_invalido', 'no_disponible']) {
    const es = describeVoucherReason(code, true);
    const en = describeVoucherReason(code, false);
    assert.ok(es && en && es !== en, code);
    assert.ok(!es.includes(code) && !en.includes(code), `${code} no se muestra crudo`);
  }
  assert.match(describeVoucherReason('pago_no_verificado', false), /not been verified/);
  assert.match(describeVoucherReason('codigo_nuevo_x', true), /no reconocido/);
  assert.match(describeVoucherReason('codigo_nuevo_x', false), /unrecognized/);
  assert.doesNotMatch(describeVoucherReason('codigo_nuevo_x', true), /codigo_nuevo_x/);
  assert.equal(describeVoucherReason(null, true), '');
  const src = readFileSync(new URL('../src/components/LeadPaymentPanel.tsx', import.meta.url), 'utf8');
  assert.ok(src.includes('describeVoucherReason(status.voucherMotivo, es)'), 'el panel traduce voucherMotivo');
  assert.doesNotMatch(src, /\(\$\{status\.voucherMotivo\}\)/, 'el panel no muestra el motivo crudo');
});

test('checkout_unavailable: política de la reserva vs. falla de Stripe, con el motivo real', () => {
  const provider = { error: 'checkout_unavailable', message: 'Falta la confirmación del proveedor. No se generó ningún cobro.' };
  assert.equal(classifyCheckoutUnavailable(409, provider).kind, 'policy');
  assert.equal(classifyCheckoutUnavailable(409, provider).reason, 'provider_not_confirmed');
  assert.match(describeLeadPaymentError(409, provider, true), /^Reserva no elegible.*proveedor/);
  assert.match(describeLeadPaymentError(409, provider, false), /^Booking not eligible.*provider has not confirmed/);

  const paid = { error: 'checkout_unavailable', message: 'La reserva no existe o ya tiene un pago verificado.' };
  assert.equal(classifyCheckoutUnavailable(409, paid).reason, 'already_paid_or_missing');
  assert.match(describeLeadPaymentError(409, paid, false), /already has a verified payment/);

  const notPayable = { error: 'checkout_unavailable', message: 'La reserva no está disponible para cobrar.' };
  assert.equal(classifyCheckoutUnavailable(409, notPayable).reason, 'booking_not_payable');
  assert.match(describeLeadPaymentError(409, notPayable, false), /not eligible for payment/);

  const noStripe = { error: 'checkout_unavailable', message: 'Pagos no disponibles: Stripe no está configurado en el servidor.' };
  assert.equal(classifyCheckoutUnavailable(503, noStripe).kind, 'stripe');
  assert.match(describeLeadPaymentError(503, noStripe, false), /^Stripe did not create.*not configured/);

  const stripeErr = { error: 'checkout_unavailable', message: 'Invalid API Key provided' };
  const c = classifyCheckoutUnavailable(500, stripeErr);
  assert.equal(c.kind, 'stripe');
  assert.equal(c.reason, null);
  assert.match(describeLeadPaymentError(500, stripeErr, true), /^Stripe no generó.*Invalid API Key provided/);
  assert.match(describeLeadPaymentError(500, stripeErr, false), /server: Invalid API Key provided/);

  // reason explícito del backend tiene prioridad; 409 sin catálogo = política.
  assert.equal(classifyCheckoutUnavailable(500, { error: 'checkout_unavailable', reason: 'invalid_amount' }).kind, 'policy');
  assert.equal(classifyCheckoutUnavailable(409, { error: 'checkout_unavailable', message: 'otro motivo' }).kind, 'policy');

  for (const body of [provider, paid, notPayable, noStripe, stripeErr]) {
    for (const es of [true, false]) {
      const msg = describeLeadPaymentError(body === noStripe ? 503 : 409, body, es);
      assert.match(msg, es ? /No se generó ningún cobro/ : /No charge was created/);
      assert.doesNotMatch(msg, es ? /\bpagad[oa]\b/i : /\bpaid\b/i);
    }
  }
});
