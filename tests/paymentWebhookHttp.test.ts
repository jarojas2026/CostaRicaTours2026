import assert from 'node:assert/strict';
import test from 'node:test';
import { createPaymentWebhookHandlers } from '../backend/paymentWebhookHttpService';

function response() {
  const result = { status: 0, body: null as any, headers: {} as Record<string, string> };
  const res = {
    setHeader(name: string, value: string) { result.headers[name] = value; },
    status(code: number) { result.status = code; return this; },
    json(body: any) { result.body = body; return this; }
  };
  return { res: res as any, result };
}

test('Stripe passes exact signed bytes to verification and signals only correlated accepted payments', async () => {
  const raw = Buffer.from('{ "id": "evt_test", "amount": 100.00 }\n');
  const signals: any[] = [];
  const handlers = createPaymentWebhookHandlers({
    stripe: async (body, signature) => {
      assert.equal(body, raw);
      assert.equal(signature, 'signed-test');
      return { accepted: true, bookingId: 'CRT-test', eventId: 'evt_test' };
    },
    paypal: async () => { throw new Error('unexpected PayPal'); },
    emit: async event => { signals.push(event); return {} as any; }
  });
  const { res, result } = response();
  await handlers.stripe({ headers: { 'stripe-signature': 'signed-test' }, rawBody: raw } as any, res);
  assert.equal(result.status, 200);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].payload.bookingId, 'CRT-test');
  assert.equal(signals[0].conversationId, 'CRT-test');
  assert.equal(result.headers['x-correlation-id'], result.body.correlationId);
});

test('invalid webhook envelopes cannot invoke payment verification', async () => {
  let calls = 0;
  const verify = async () => { calls++; return { accepted: true }; };
  const handlers = createPaymentWebhookHandlers({ stripe: verify, paypal: verify, emit: async () => ({} as any) });
  for (const req of [{ headers: {}, rawBody: Buffer.from('{}') }, { headers: { 'stripe-signature': 'signed' }, body: {} }]) {
    const { res, result } = response();
    await handlers.stripe(req as any, res);
    assert.equal(result.status, 400);
  }
  const { res, result } = response();
  await handlers.paypal({ headers: {}, body: { id: 'evt_test' } } as any, res);
  assert.equal(result.status, 400);
  assert.equal(calls, 0);
});

test('duplicates and ignored events do not emit a second payment signal', async () => {
  let emitted = 0;
  for (const payment of [{ accepted: true, duplicate: true, bookingId: 'CRT-test' }, { accepted: true, reason: 'event_not_actionable' }]) {
    const handlers = createPaymentWebhookHandlers({
      stripe: async () => payment, paypal: async () => payment,
      emit: async () => { emitted++; return {} as any; }
    });
    const { res, result } = response();
    await handlers.stripe({ headers: { 'stripe-signature': 'signed' }, rawBody: Buffer.from('{}') } as any, res);
    assert.equal(result.status, 200);
  }
  assert.equal(emitted, 0);
});

test('transient verification failures request redelivery without leaking internal errors', async () => {
  const handlers = createPaymentWebhookHandlers({
    stripe: async () => { throw new Error('private database details'); },
    paypal: async () => ({ accepted: false }), emit: async () => ({} as any)
  });
  const { res, result } = response();
  await handlers.stripe({ headers: { 'stripe-signature': 'signed' }, rawBody: Buffer.from('{}') } as any, res);
  assert.equal(result.status, 503);
  assert.equal(result.body.error, 'payment_webhook_unavailable');
  assert.doesNotMatch(JSON.stringify(result.body), /private database/);
});

test('PayPal forwards signature headers and agent telemetry failure does not reject a persisted payment', async () => {
  const headers = Object.fromEntries(['paypal-transmission-id', 'paypal-transmission-time', 'paypal-transmission-sig', 'paypal-cert-url', 'paypal-auth-algo'].map(key => [key, 'test']));
  const event = { id: 'evt_test' };
  const handlers = createPaymentWebhookHandlers({
    stripe: async () => ({ accepted: false }),
    paypal: async (seenHeaders, seenEvent) => {
      assert.equal(seenHeaders, headers);
      assert.equal(seenEvent, event);
      return { accepted: true, bookingId: 'CRT-test', eventId: 'evt_test' };
    },
    emit: async () => { throw new Error('telemetry unavailable'); }
  });
  const { res, result } = response();
  await handlers.paypal({ headers, body: event } as any, res);
  assert.equal(result.status, 200);
  assert.equal(result.body.accepted, true);
});
