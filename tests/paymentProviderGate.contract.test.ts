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

test('payment precheck queries private Cloud Run status with serverless authorization', () => {
  assert.match(source, /\/api\/provider\/status\/\$\{encodeURIComponent\(bookingId\)\}/);
  assert.match(source, /'x-serverless-authorization': `Bearer \$\{cloudRunIdToken\}`/);
  assert.match(source, /vercel-oidc-wif-payment-precheck/);
});
