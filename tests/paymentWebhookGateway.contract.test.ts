import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gateway = fs.readFileSync(path.join(root, 'api/gateway.ts'), 'utf8');
const ingress = fs.readFileSync(path.join(root, 'api/_paymentWebhookIngress.ts'), 'utf8');
const webhookHttp = fs.readFileSync(path.join(root, 'backend/paymentWebhookHttpService.ts'), 'utf8');

test('payment webhooks are intercepted before the generic gateway body path', () => {
  assert.match(gateway, /forwardedPath === 'webhooks\/stripe'/);
  assert.match(gateway, /forwardedPath === 'webhooks\/paypal'/);
  assert.match(gateway, /readRawRequestBody\(req\)/);
  assert.match(gateway, /translateStripeWebhook\(rawBody, req\.headers\)/);
  assert.match(gateway, /translatePayPalWebhook\(rawBody, req\.headers\)/);
});

test('Stripe webhook ingress verifies the provider signature before forwarding', () => {
  assert.match(ingress, /STRIPE_WEBHOOK_SECRET/);
  assert.match(ingress, /stripe-signature/);
  assert.match(ingress, /stripe\.webhooks\.constructEvent\(rawBody, signature, signingSecret\)/);
  assert.match(ingress, /targetPath: '\/api\/payments\/stripe\/return'/);
  assert.match(ingress, /body: \{ sessionId: session\.id \}/);
});

test('PayPal webhook ingress verifies the official signature before forwarding', () => {
  assert.match(ingress, /PAYPAL_WEBHOOK_ID/);
  assert.match(ingress, /verify-webhook-signature/);
  assert.match(ingress, /verification_status !== 'SUCCESS'/);
  assert.match(ingress, /targetPath: '\/api\/payments\/paypal\/return'/);
  assert.match(ingress, /body: \{ orderId \}/);
});

test('the edge never mutates the authoritative booking ledger', () => {
  assert.doesNotMatch(ingress, /updateBookingStatus/);
  assert.doesNotMatch(ingress, /getFirestoreDb/);
  assert.doesNotMatch(gateway, /updateBookingStatus/);
  assert.doesNotMatch(gateway, /getFirestoreDb/);
  assert.match(gateway, /gatewayHandler\(translated, res\)/);
});

test('verified payments continue through the canonical reservation orchestrator', () => {
  assert.match(webhookHttp, /advanceReservationLifecycle/);
  assert.match(webhookHttp, /getBookingById\(result\.bookingId\)/);
  assert.match(webhookHttp, /payment\.lifecycle\.advanced/);
  assert.match(webhookHttp, /payment\.lifecycle\.deferred/);
});

test('downstream lifecycle failures do not reject a provider-valid payment webhook', () => {
  assert.match(webhookHttp, /catch \(error\)[\s\S]*payment\.lifecycle\.deferred/);
  assert.match(webhookHttp, /const lifecycle = await finalizeVerifiedWebhook\('stripe', result\);[\s\S]*res\.status\(200\)/);
  assert.match(webhookHttp, /const lifecycle = await finalizeVerifiedWebhook\('paypal', result\);[\s\S]*res\.status\(200\)/);
});

test('duplicate provider events do not re-run lifecycle side effects', () => {
  assert.match(webhookHttp, /result\.duplicate/);
  assert.match(webhookHttp, /if \(!result\.accepted \|\| result\.duplicate \|\| !result\.bookingId\) return null/);
});

test('legacy synthetic payment and confirmation endpoints are not used by webhook ingress', () => {
  assert.doesNotMatch(ingress, /\/api\/pagos\/solicitud/);
  assert.doesNotMatch(ingress, /\/api\/reservas\/confirmar/);
  assert.doesNotMatch(gateway, /\/api\/pagos\/solicitud/);
  assert.doesNotMatch(gateway, /\/api\/reservas\/confirmar/);
});
