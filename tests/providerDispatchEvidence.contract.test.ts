import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const provider = readFileSync('backend/providerCommunicationService.ts', 'utf8');
const notifications = readFileSync('backend/notificationService.ts', 'utf8');
const lifecycle = readFileSync('backend/reservationLifecycleOrchestrator.ts', 'utf8');

test('service order is persisted pending BEFORE any email transport submission', () => {
  const pending = provider.indexOf("status: 'dispatch_pending'");
  const persisted = provider.indexOf('await persistServiceOrder(order);', pending);
  const send = provider.indexOf('const delivery = await sendEmail({', pending);
  assert.ok(pending > 0 && persisted > pending && send > persisted);
});

test('service order only becomes dispatched after transport accepts the email', () => {
  const send = provider.indexOf('const delivery = await sendEmail({');
  const check = provider.indexOf('if (!delivery.success)', send);
  const accepted = provider.indexOf("order.deliveryStatus = 'transport_accepted'", check);
  const dispatched = provider.indexOf("order.status = 'dispatched'", accepted);
  assert.ok(send > 0 && check > send && accepted > check && dispatched > accepted);
  assert.match(provider, /throw new Error\('provider_email_submission_failed'\)/);
  assert.match(provider, /throw new Error\('provider_email_not_configured'\)/);
  assert.match(provider, /existingOrder\?\.id \|\|/);
  assert.match(provider, /deliveryStatus = 'failed'/);
  assert.match(provider, /order\.status = 'dispatched'/);
});

test('unconfigured transport never reports simulated success and lifecycle only advances on return', () => {
  assert.match(notifications, /email_transport_unconfigured/);
  assert.doesNotMatch(notifications, /sim-mail-/);
  assert.match(lifecycle, /const order = await dispatchServiceOrder\(/);
  assert.match(lifecycle, /catch \(error: any\)/);
});
