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

test('Express captures raw request bytes before Stripe signature verification', () => {
  assert.match(server, /express\.json\(\{[^}]*verify:\s*\(req,\s*_res,\s*buf\)[\s\S]*rawBody\s*=\s*Buffer\.from\(buf\)/);
});
