import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
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

test('getStripe siempre devuelve null y el runtime no importa ni instancia el SDK', () => {
  const booking = readFileSync('backend/bookingService.ts', 'utf8');
  const body = booking.slice(booking.indexOf('export function getStripe()'), booking.indexOf('let aiClient'));
  assert.match(body, /return null/);
  assert.doesNotMatch(booking, /from ['"]stripe['"]|new Stripe\(/);
  assert.doesNotMatch(readFileSync('backend/routes/payments.ts', 'utf8'), /checkout\.sessions\.(create|retrieve)/);
});

test('ingress de webhook falla cerrado sin crear cliente ni aceptar eventos Stripe', () => {
  const ingress = readFileSync('api/_paymentWebhookIngress.ts', 'utf8');
  assert.match(ingress, /STRIPE_DISABLED_REASON/);
  assert.match(ingress, /throw new Error/);
  assert.doesNotMatch(ingress, /STRIPE_WEBHOOK_SECRET/);
  assert.doesNotMatch(ingress, /stripe\.webhooks\.constructEvent/);
});


test('no SDK, public key, webhook secret, or Stripe CSP origin remains in active manifests', () => {
  const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
  const functionsPackage = JSON.parse(readFileSync('functions/package.json', 'utf8'));
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  assert.equal(rootPackage.dependencies?.stripe, undefined);
  assert.equal(rootPackage.dependencies?.['@stripe/stripe-js'], undefined);
  assert.equal(functionsPackage.dependencies?.stripe, undefined);
  assert.equal(lock.packages?.['node_modules/stripe'], undefined);
  assert.equal(lock.packages?.['node_modules/@stripe/stripe-js'], undefined);
  assert.doesNotMatch(readFileSync('.github/workflows/build-check.yml', 'utf8'), /STRIPE_SECRET_KEY|VITE_STRIPE_PUBLIC_KEY/);
  assert.doesNotMatch(readFileSync('.github/workflows/e2e.yml', 'utf8'), /VITE_STRIPE_PUBLIC_KEY/);
  assert.doesNotMatch(readFileSync('vercel.json', 'utf8'), /stripe\.com|stripe\.js/i);
  assert.doesNotMatch(readFileSync('src/lib/apiManager.js', 'utf8'), /VITE_STRIPE_PUBLIC_KEY|stripe:/i);
});

test('legacy Express Stripe endpoints return HTTP 410 and cannot create or verify payments', async () => {
  const { createApp } = await import('../backend/app');
  const server = createApp().listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    for (const path of ['/api/stripe/create-checkout-session', '/api/payments/stripe/return', '/api/webhooks/stripe']) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId: 'legacy-test', sessionId: 'legacy-test' }),
      });
      assert.equal(response.status, 410, path);
      const body = await response.json();
      assert.equal(body.error, 'stripe_disabled_by_product_policy', path);
    }
  } finally {
    server.close();
  }
});
