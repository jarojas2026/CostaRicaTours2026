import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  sendEmailWithOutcome,
  emailFailurePatch,
  emailRetriesExhausted,
  MAX_EMAIL_DELIVERY_ATTEMPTS,
} from '../backend/emailDeliveryOutcome';

const payload = { to: 'nobody@example.invalid', subject: 'test', html: '<p>x</p>' };

test('#325 sendEmailWithOutcome: success:false is never reported as sent and retries are bounded', async () => {
  let calls = 0;
  const outcome = await sendEmailWithOutcome(payload, 5, async () => {
    calls++;
    return { success: false, error: 'smtp down for nobody@example.invalid' };
  });
  assert.equal(outcome.success, false);
  assert.equal(calls, MAX_EMAIL_DELIVERY_ATTEMPTS);
  assert.equal(outcome.attempts, MAX_EMAIL_DELIVERY_ATTEMPTS);
  assert.doesNotMatch(String(outcome.error), /@example\.invalid/, 'no PII in recorded error');
});

test('#325 sendEmailWithOutcome: thrown errors become failed outcomes', async () => {
  const outcome = await sendEmailWithOutcome(payload, 2, async () => {
    throw new Error('network');
  });
  assert.equal(outcome.success, false);
  assert.equal(outcome.error, 'network');
});

test('#325 sendEmailWithOutcome: unconfigured transport is not retried', async () => {
  let calls = 0;
  const outcome = await sendEmailWithOutcome(payload, 2, async () => {
    calls++;
    return { success: false, error: 'email_transport_unconfigured' };
  });
  assert.equal(calls, 1);
  assert.equal(outcome.success, false);
});

test('#325 sendEmailWithOutcome: success on second attempt', async () => {
  let calls = 0;
  const outcome = await sendEmailWithOutcome(payload, 2, async () => {
    calls++;
    return calls === 1 ? { success: false, error: 'temporary' } : { success: true, id: 'msg-1' };
  });
  assert.deepEqual(outcome, { success: true, id: 'msg-1', attempts: 2 });
});

test('#325 emailFailurePatch: pending then failed, never sets the Sent flag', () => {
  const first = emailFailurePatch('vipCoupon', undefined, { success: false, attempts: 1, error: 'x' });
  assert.equal(first.vipCouponDeliveryStatus, 'pending');
  assert.equal(first.vipCouponDeliveryAttempts, 1);
  assert.equal('vipCouponSent' in first, false);
  const second = emailFailurePatch('vipCoupon', 1, { success: false, attempts: 1, error: 'x' });
  assert.equal(second.vipCouponDeliveryStatus, 'failed');
  assert.equal(emailRetriesExhausted(second.vipCouponDeliveryAttempts), true);
  assert.equal(emailRetriesExhausted(0), false);
});

test('#325 nativeWorkflows: scheduled customer emails only mark Sent after a successful delivery', () => {
  const code = readFileSync('backend/nativeWorkflows.ts', 'utf8');
  for (const prefix of ['weatherNotice', 'morningConcierge', 'preSaleRecovery', 'vipCoupon']) {
    const sentAt = code.indexOf(`${prefix}Sent: true`);
    assert.ok(sentAt > 0, `${prefix} flag present`);
    const guard = code.lastIndexOf('if (delivery.success) {', sentAt);
    const send = code.lastIndexOf('const delivery = await sendEmailWithOutcome({', sentAt);
    assert.ok(send > 0 && guard > send, `${prefix}Sent must be guarded by delivery.success`);
    assert.match(code, new RegExp(`emailFailurePatch\\('${prefix}'`), `${prefix} failure is recorded`);
    assert.match(code, new RegExp(`emailRetriesExhausted\\(b\\.${prefix}DeliveryAttempts\\)`), `${prefix} retry is bounded`);
  }
  assert.doesNotMatch(code, /\n\s*await sendEmail\(\{/, 'no fire-and-forget sendEmail in nativeWorkflows');
});

test('#325 emailOperationsAgent: customer notification outcome is recorded', () => {
  const code = readFileSync('backend/emailOperationsAgent.ts', 'utf8');
  assert.doesNotMatch(code, /await sendEmail\(\{[\s\S]{0,600}?\}\)\.catch\(\(\) => undefined\)/);
  assert.match(code, /customerNotification/);
  assert.match(code, /customerNotified: customerNotification\.status === 'sent'/);
});

test('#325 providerInboxAgent: customer notification outcome is recorded', () => {
  const code = readFileSync('backend/providerInboxAgent.ts', 'utf8');
  assert.doesNotMatch(code, /await sendEmail\(/);
  assert.match(code, /sendEmailWithOutcome/);
  assert.match(code, /customerNotified:notification\.customerEmail\.status==='sent'/);
});
