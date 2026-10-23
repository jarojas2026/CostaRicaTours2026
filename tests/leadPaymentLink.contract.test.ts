import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { createLeadPaymentLink, type LeadPaymentLinkDeps } from '../backend/leadPaymentLink';

const testMode = () => ({ mode: 'test' as const, blocked: false });

function deps(overrides: Partial<LeadPaymentLinkDeps> = {}) {
  const calls: string[] = [];
  const d: LeadPaymentLinkDeps = {
    getLead: async (id) => (id === 'lead_ok' ? { id, bookingId: 'bk_123' } : id === 'lead_nobk' ? { id } : null),
    createCheckout: async (bookingId) => { calls.push(bookingId); return { status: 200, body: { url: 'https://checkout.stripe.com/c/pay/cs_test_abc', id: 'cs_test_abc' } }; },
    stripeMode: testMode,
    ...overrides,
  };
  return { d, calls };
}

test('lead con reserva: devuelve el enlace del checkout TEST existente, pago pendiente', async () => {
  const { d, calls } = deps();
  const r = await createLeadPaymentLink('lead_ok', d);
  assert.equal(r.status, 200);
  assert.deepEqual(calls, ['bk_123']);
  assert.equal(r.body.url, 'https://checkout.stripe.com/c/pay/cs_test_abc');
  assert.equal(r.body.sessionId, 'cs_test_abc');
  assert.equal(r.body.mode, 'test');
  assert.equal(r.body.paymentStatus, 'pending');
});

test('lead inexistente: 404 y sin llamada a Stripe', async () => {
  const { d, calls } = deps();
  const r = await createLeadPaymentLink('lead_missing', d);
  assert.equal(r.status, 404);
  assert.equal(calls.length, 0);
});

test('id inválido: 400 sin consultar nada', async () => {
  const { d, calls } = deps();
  const r = await createLeadPaymentLink('../etc', d);
  assert.equal(r.status, 400);
  assert.equal(calls.length, 0);
});

test('lead sin reserva enlazada: 409 lead_without_booking, ningún cobro', async () => {
  const { d, calls } = deps();
  const r = await createLeadPaymentLink('lead_nobk', d);
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'lead_without_booking');
  assert.equal(calls.length, 0);
});

test('clave en vivo sin ALLOW_STRIPE_LIVE: 503 stripe_live_blocked antes de Stripe', async () => {
  const { d, calls } = deps({ stripeMode: () => ({ mode: 'live', blocked: true, reason: 'x' }) });
  const r = await createLeadPaymentLink('lead_ok', d);
  assert.equal(r.status, 503);
  assert.equal(r.body.error, 'stripe_live_blocked');
  assert.equal(calls.length, 0);
});

test('modo real por defecto: sk_live_ sin ALLOW_STRIPE_LIVE se bloquea', async () => {
  const prevKey = process.env.STRIPE_SECRET_KEY;
  const prevAllow = process.env.ALLOW_STRIPE_LIVE;
  process.env.STRIPE_SECRET_KEY = 'sk_live_contract_test_never_real';
  delete process.env.ALLOW_STRIPE_LIVE;
  try {
    const { d, calls } = deps({ stripeMode: undefined });
    const r = await createLeadPaymentLink('lead_ok', d);
    assert.equal(r.status, 503);
    assert.equal(calls.length, 0);
  } finally {
    if (prevKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = prevKey;
    if (prevAllow !== undefined) process.env.ALLOW_STRIPE_LIVE = prevAllow;
  }
});

test('checkout rechaza la reserva (sin confirmación del proveedor): se propaga 409 sin enlace', async () => {
  const { d } = deps({ createCheckout: async () => ({ status: 409, body: { error: 'Falta la confirmación del proveedor. No se generó ningún cobro.' } }) });
  const r = await createLeadPaymentLink('lead_ok', d);
  assert.equal(r.status, 409);
  assert.equal(r.body.success, false);
  assert.equal(r.body.url, undefined);
});

test('cableado: la ruta exige requireOwner y reutiliza el checkout existente', () => {
  const src = fs.readFileSync('backend/routes/leads.ts', 'utf8');
  assert.match(src, /\.post\('\/api\/admin\/leads\/:id\/payment-link',\s*requireOwner,/);
  assert.match(src, /createCheckout:\s*createStripeCheckoutForBooking/);
  const lib = fs.readFileSync('backend/leadPaymentLink.ts', 'utf8');
  assert.doesNotMatch(lib, /new Stripe\(|checkout\.sessions\.create|from '\.\/paymentWebhook/);
  const payments = fs.readFileSync('backend/routes/payments.ts', 'utf8');
  assert.match(payments, /checkoutRouter\.post\('\/api\/stripe\/create-checkout-session', paymentLimiter,/);
});

test('HTTP: sin sesión de owner se rechaza (401/403/503) y nunca genera enlace', async () => {
  const { createApp } = await import('../backend/app');
  const server = createApp().listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/leads/lead_ok/payment-link`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.ok([401, 403, 503].includes(res.status), `status inesperado ${res.status}`);
    const body = await res.json();
    assert.equal(body.url, undefined);
  } finally {
    server.close();
  }
});
