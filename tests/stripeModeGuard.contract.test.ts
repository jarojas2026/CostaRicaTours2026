import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { checkStripeMode, assertStripeTestMode, STRIPE_DISABLED_REASON } from '../backend/stripeModeGuard';

test('bloquea claves Stripe TEST y LIVE por política de la plataforma', () => {
  for (const key of ['sk_test_contract_only', 'rk_test_contract_only', 'sk_live_contract_only', 'rk_live_contract_only']) {
    const result = checkStripeMode(key);
    assert.equal(result.blocked, true);
    assert.equal(result.reason, STRIPE_DISABLED_REASON);
    assert.throws(() => assertStripeTestMode(key), new RegExp(STRIPE_DISABLED_REASON));
  }
});

test('sin clave también reporta Stripe deshabilitado y no disponible', () => {
  const result = checkStripeMode('');
  assert.equal(result.mode, 'none');
  assert.equal(result.blocked, true);
  assert.throws(() => assertStripeTestMode(''), new RegExp(STRIPE_DISABLED_REASON));
});

test('ALLOW_STRIPE_LIVE nunca puede reactivar Stripe', () => {
  const previous = process.env.ALLOW_STRIPE_LIVE;
  const previousKey = process.env.STRIPE_SECRET_KEY;
  process.env.ALLOW_STRIPE_LIVE = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_contract_only';
  try {
    assert.equal(checkStripeMode().blocked, true);
    assert.throws(() => assertStripeTestMode(), new RegExp(STRIPE_DISABLED_REASON));
  } finally {
    if (previous === undefined) delete process.env.ALLOW_STRIPE_LIVE;
    else process.env.ALLOW_STRIPE_LIVE = previous;
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousKey;
  }
});

test('getStripe no puede crear cliente y los routes no crean clientes alternativos', () => {
  const booking = readFileSync('backend/bookingService.ts', 'utf8');
  const body = booking.slice(booking.indexOf('export function getStripe()'), booking.indexOf('let aiClient'));
  assert.match(body, /assertStripeTestMode\(process\.env\.STRIPE_SECRET_KEY\)/);
  assert.ok(body.indexOf('assertStripeTestMode') < body.indexOf('new Stripe('));
  assert.doesNotMatch(readFileSync('backend/routes/payments.ts', 'utf8'), /new Stripe\(/);
});

test('ingress de webhook falla cerrado sin crear cliente ni aceptar eventos Stripe', () => {
  const ingress = readFileSync('api/_paymentWebhookIngress.ts', 'utf8');
  assert.match(ingress, /STRIPE_DISABLED_REASON/);
  assert.match(ingress, /throw new Error/);
  assert.doesNotMatch(ingress, /STRIPE_WEBHOOK_SECRET/);
  assert.doesNotMatch(ingress, /stripe\.webhooks\.constructEvent/);
});
