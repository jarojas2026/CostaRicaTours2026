import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readServerSource } from '../scripts/lib/serverSource';

const server = readServerSource();

test('signed payment webhook HTTP bridge is registered on the canonical Express server', () => {
  assert.match(server, /paymentWebhookHttpService/);
  assert.match(server, /app\.post\('\/api\/webhooks\/stripe',\s*handleStripeWebhook\)/);
  assert.match(server, /app\.post\('\/api\/webhooks\/paypal',\s*handlePayPalWebhook\)/);
});

test('Stripe webhook handler is registered only as a retired fail-closed route', () => {
  const handler = readFileSync('backend/paymentWebhookHttpService.ts', 'utf8');
  assert.match(handler, /handleStripeWebhook[\s\S]*status\(410\)/);
  assert.doesNotMatch(handler, /processStripeWebhook\(rawBody/);
});
