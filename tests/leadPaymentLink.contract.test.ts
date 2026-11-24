import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createLeadPaymentLink, type LeadPaymentLinkDeps } from '../backend/leadPaymentLink';
import type { AddressInfo } from 'node:net';

function deps() {
  const calls: string[] = [];
  const d: LeadPaymentLinkDeps = {
    getLead: async (id) => { calls.push(`lead:${id}`); return { id, bookingId: 'bk_123' }; },
    createCheckout: async (bookingId) => { calls.push(`checkout:${bookingId}`); return { status: 200, body: { url: 'https://invalid.example/payment' } }; },
  };
  return { d, calls };
}

test('lead payment links are permanently disabled and no dependency is called', async () => {
  const { d, calls } = deps();
  const r = await createLeadPaymentLink('lead_ok', d);
  assert.equal(r.status, 410);
  assert.equal(r.body.error, 'stripe_disabled_by_product_policy');
  assert.equal(calls.length, 0);
  assert.equal(r.body.url, undefined);
});

test('legacy payment-link route remains fail-closed behind owner authorization', () => {
  const src = fs.readFileSync('backend/routes/leads.ts', 'utf8');
  assert.match(src, /\.post\('\/api\/admin\/leads\/:id\/payment-link',\s*requireOwner,/);
  assert.match(src, /createLeadPaymentLink\(/);
  const lib = fs.readFileSync('backend/leadPaymentLink.ts', 'utf8');
  assert.match(lib, /status: 410/);
  assert.doesNotMatch(lib, /checkout\.sessions\.create|STRIPE_SECRET_KEY|new Stripe\(/);
  const payments = fs.readFileSync('backend/routes/payments.ts', 'utf8');
  assert.match(payments, /status: 410/);
});

test('HTTP: without owner session no payment link is ever returned', async () => {
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
