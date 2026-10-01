import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = fs.readFileSync(path.join(process.cwd(), 'api', '[...path].ts'), 'utf8');

test('Stripe and PayPal checkout creation are gated by provider evidence', () => {
  assert.match(source, /\/api\/stripe\/create-checkout-session/);
  assert.match(source, /\/api\/paypal\/create-order/);
  assert.match(source, /assertProviderEvidenceBeforePayment/);
  assert.match(source, /provider_confirmation_required/);
  assert.match(source, /No se generó ningún cobro/);
});

test('provider evidence is read only through private Cloud Run authorization', () => {
  assert.match(source, /\/api\/provider\/status\/\$\{encodeURIComponent\(bookingId\)\}/);
  assert.match(source, /'x-serverless-authorization': `Bearer \$\{cloudRunIdToken\}`/);
  assert.match(source, /vercel-oidc-wif-provider-evidence/);
});

test('customer readiness facade returns only sanitized payment readiness state', () => {
  assert.match(source, /CUSTOMER_READINESS_PREFIX/);
  assert.match(source, /readyForPayment: evidence\.state === 'confirmed'/);
  assert.doesNotMatch(source, /readyForPayment:[\s\S]{0,250}providerName:/);
  assert.doesNotMatch(source, /readyForPayment:[\s\S]{0,250}providerId:/);
});
