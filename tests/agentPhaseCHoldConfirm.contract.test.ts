import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AGENT_BOOKING_COLLECTION,
  AGENT_HOLD_COLLECTION,
  HOLD_DURATION_MINUTES,
  buildNumber,
  confirmBooking,
  holdBooking,
  isExplicitConfirmation,
} from '../backend/agentBookingHold';
import { hashIdentifier } from '../backend/agentEventLog';
import { PHASE_C_DECLARATIONS, PHASE_C_TOOL_REGISTRY, isPhaseCTool } from '../backend/agentPhaseCRegistry';
import { isTransactionalTool, filterVoiceTools } from '../backend/voiceHandoffPolicy';

const NOW = new Date('2026-10-28T20:00:00-06:00');
const SESSION = 'web_chat_session_1';

/** Firestore falso: colecciones en memoria con add + where('==').limit().get(). */
function fakeDb(seed: Record<string, Array<Record<string, any>>> = {}) {
  const cols: Record<string, Array<{ id: string; data: Record<string, any> }>> = {};
  let n = 0;
  for (const [name, docs] of Object.entries(seed)) cols[name] = docs.map(d => ({ id: `seed${++n}`, data: d }));
  const db = {
    cols,
    collection: (name: string) => ({
      add: async (doc: Record<string, any>) => { (cols[name] ||= []).push({ id: `doc${++n}`, data: doc }); return { id: `doc${n}` }; },
      where: (field: string, _op: '==', value: unknown) => ({ limit: (k: number) => ({ get: async () => {
        const docs = (cols[name] || []).filter(d => d.data[field] === value).slice(0, k).map(d => ({ id: d.id, exists: true, data: () => d.data }));
        return { size: docs.length, empty: !docs.length, docs };
      } }) }),
    }),
  };
  return db;
}

const quote = (over: Record<string, any> = {}) => ({
  quoteNumber: 'QTE-20261028-AB12', status: 'quoted', tourId: 'sjo-3-in-1-combo', date: '2026-12-01', pax: 2,
  clientPriceUSD: 290, sessionIdHash: hashIdentifier('session', SESSION), expiresAt: '2026-10-30T20:00:00.000Z',
  internal: { providerId: 'secret-op', supplierCostUSD: 200, marginUSD: 90 }, ...over,
});

const testMode = () => ({ mode: 'test' as const, blocked: false });

test('hold_booking aparta la cotización de la misma sesión, sin cobrar y con vencimiento acotado', async () => {
  const db = fakeDb({ agent_quotes: [quote()] });
  const r: any = await holdBooking({ quoteNumber: 'qte-20261028-ab12' }, { sessionId: SESSION }, { db, now: () => NOW, randomHex: () => 'c0de' });
  assert.equal(r.success, true);
  assert.equal(r.holdNumber, 'HLD-20261028-C0DE');
  assert.equal(r.charged, false);
  assert.equal(r.totalPrice, 290);
  assert.equal(Date.parse(r.expiresAt) - NOW.getTime(), HOLD_DURATION_MINUTES * 60_000);
  assert.doesNotMatch(JSON.stringify(r), /secret-op|supplierCost|margin/);
  const stored = db.cols[AGENT_HOLD_COLLECTION][0].data;
  assert.equal(stored.status, 'held');
  assert.equal(stored.charged, false);
  assert.doesNotMatch(JSON.stringify(stored), /web_chat_session_1|secret-op/);
  // Idempotente.
  const again: any = await holdBooking({ quoteNumber: 'QTE-20261028-AB12' }, { sessionId: SESSION }, { db, now: () => NOW });
  assert.equal(again.reused, true);
  assert.equal(db.cols[AGENT_HOLD_COLLECTION].length, 1);
  // La cotización original no se modifica.
  assert.equal(db.cols.agent_quotes[0].data.status, 'quoted');
});

test('hold_booking: otra sesión, cotización vencida o número inválido no apartan', async () => {
  const db = fakeDb({ agent_quotes: [quote(), quote({ quoteNumber: 'QTE-20261027-0001', expiresAt: '2026-10-28T00:00:00.000Z' })] });
  assert.equal((await holdBooking({ quoteNumber: 'QTE-20261028-AB12' }, { sessionId: 'otra' }, { db, now: () => NOW }) as any).error, 'quote_not_found');
  assert.equal((await holdBooking({ quoteNumber: 'QTE-20261027-0001' }, { sessionId: SESSION }, { db, now: () => NOW }) as any).error, 'quote_expired');
  assert.equal((await holdBooking({ quoteNumber: 'x' }, { sessionId: SESSION }, { db, now: () => NOW }) as any).error, 'invalid_quote_number');
  assert.equal((await holdBooking({ quoteNumber: 'QTE-20261028-AB12' }, {}, { db, now: () => NOW }) as any).error, 'session_required');
  assert.equal((await holdBooking({ quoteNumber: 'QTE-20261028-AB12' }, { sessionId: SESSION }, { db: null }) as any).error, 'storage_unavailable');
});

async function heldDb() {
  const db = fakeDb({ agent_quotes: [quote()] });
  const h: any = await holdBooking({ quoteNumber: 'QTE-20261028-AB12' }, { sessionId: SESSION }, { db, now: () => NOW, randomHex: () => 'beef' });
  return { db, holdNumber: h.holdNumber as string };
}

test('confirm_booking exige confirmación explícita literal del cliente', async () => {
  const { db, holdNumber } = await heldDb();
  let called = 0;
  const deps = { db, now: () => NOW, stripeMode: testMode, createCheckoutSession: async () => { called++; return { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }; } };
  for (const msg of ['ok', 'tal vez', 'no confirmo todavía', "I don't confirm", '']) {
    const r: any = await confirmBooking({ holdNumber }, { sessionId: SESSION, userMessage: msg }, deps);
    assert.equal(r.error, 'explicit_confirmation_required', msg);
  }
  assert.equal(called, 0);
  assert.equal(isExplicitConfirmation('Sí, confirmo la reserva'), true);
  assert.equal(isExplicitConfirmation('Yes, I confirm'), true);
});

test('confirm_booking: reserva PENDIENTE + enlace Stripe TEST; nada confirmado ni pagado; sin pago a proveedor', async () => {
  const { db, holdNumber } = await heldDb();
  const sessions: any[] = [];
  const deps = { db, now: () => NOW, randomHex: () => 'a1b2', stripeMode: testMode, createCheckoutSession: async (p: any) => { sessions.push(p); return { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }; } };
  const r: any = await confirmBooking({ holdNumber }, { sessionId: SESSION, userMessage: 'Sí, confirmo' }, deps);
  assert.equal(r.success, true);
  assert.equal(r.bookingNumber, 'AGB-20261028-A1B2');
  assert.equal(r.status, 'pending_supplier_verification');
  assert.equal(r.mode, 'test');
  assert.equal(sessions[0].amountCents, 29000);
  assert.equal(sessions[0].currency, 'usd');
  // Stripe: vencimiento entre 30 min y 24 h.
  const secs = sessions[0].expiresAtUnix - Math.floor(NOW.getTime() / 1000);
  assert.ok(secs >= 30 * 60 && secs <= 24 * 3600);
  const booking = db.cols[AGENT_BOOKING_COLLECTION][0].data;
  assert.equal(booking.status, 'pending_supplier_verification');
  assert.equal(booking.supplierVerified, false);
  assert.equal(booking.supplierPayout, 'manual_owner_only');
  assert.notEqual(booking.paymentStatus, 'completed');
  assert.doesNotMatch(JSON.stringify({ r, booking }), /secret-op|supplierCost|margin|confirmada|"paid"/);
  // Idempotente: un enlace por apartado.
  const again: any = await confirmBooking({ holdNumber }, { sessionId: SESSION, userMessage: 'Sí, confirmo' }, deps);
  assert.equal(again.reused, true);
  assert.equal(sessions.length, 1);
});

test('confirm_booking respeta ALLOW_STRIPE_LIVE y solo opera en TEST', async () => {
  const { db, holdNumber } = await heldDb();
  let called = 0;
  const mk = (stripeMode: any) => ({ db, now: () => NOW, stripeMode, createCheckoutSession: async () => { called++; return { id: 'cs', url: 'u' }; } });
  const ctx = { sessionId: SESSION, userMessage: 'Yes, I confirm' };
  assert.equal((await confirmBooking({ holdNumber }, ctx, mk(() => ({ mode: 'live', blocked: true }))) as any).error, 'stripe_live_blocked');
  assert.equal((await confirmBooking({ holdNumber }, ctx, mk(() => ({ mode: 'live', blocked: false }))) as any).error, 'stripe_test_only');
  assert.equal((await confirmBooking({ holdNumber }, ctx, mk(() => ({ mode: 'none', blocked: false }))) as any).error, 'stripe_not_configured');
  assert.equal(called, 0);
  // Guardia real: sk_live_ sin ALLOW_STRIPE_LIVE ⇒ bloqueado antes de Stripe.
  const prevKey = process.env.STRIPE_SECRET_KEY; const prevAllow = process.env.ALLOW_STRIPE_LIVE;
  process.env.STRIPE_SECRET_KEY = 'sk_live_fake_for_contract'; delete process.env.ALLOW_STRIPE_LIVE;
  try {
    assert.equal((await confirmBooking({ holdNumber }, ctx, { db, now: () => NOW, createCheckoutSession: async () => { called++; return { id: 'x', url: 'y' }; } }) as any).error, 'stripe_live_blocked');
  } finally {
    if (prevKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = prevKey;
    if (prevAllow !== undefined) process.env.ALLOW_STRIPE_LIVE = prevAllow;
  }
  assert.equal(called, 0);
});

test('confirm_booking: otra sesión o apartado vencido no generan enlace', async () => {
  const { db, holdNumber } = await heldDb();
  let called = 0;
  const deps = (now: Date) => ({ db, now: () => now, stripeMode: testMode, createCheckoutSession: async () => { called++; return { id: 'cs', url: 'u' }; } });
  assert.equal((await confirmBooking({ holdNumber }, { sessionId: 'otra', userMessage: 'confirmo' }, deps(NOW)) as any).error, 'hold_not_found');
  const later = new Date(NOW.getTime() + (HOLD_DURATION_MINUTES + 1) * 60_000);
  assert.equal((await confirmBooking({ holdNumber }, { sessionId: SESSION, userMessage: 'confirmo' }, deps(later)) as any).error, 'hold_expired');
  assert.equal(called, 0);
});

test('registro Fase C: herramientas con efectos, bloqueadas por voz y sin pagos a proveedores', () => {
  assert.equal(isPhaseCTool('hold_booking'), true);
  assert.equal(isPhaseCTool('confirm_booking'), true);
  assert.equal(PHASE_C_TOOL_REGISTRY.hold_booking.sideEffect, true);
  assert.equal(PHASE_C_TOOL_REGISTRY.confirm_booking.sideEffect, true);
  assert.ok(PHASE_C_DECLARATIONS.some(d => d.name === 'confirm_booking' && /explicitly confirms/.test(d.description)));
  assert.equal(isTransactionalTool('hold_booking'), true);
  assert.equal(isTransactionalTool('confirm_booking'), true);
  assert.deepEqual(filterVoiceTools([{ name: 'hold_booking' }, { name: 'confirm_booking' }, { name: 'get_product' }], {}).map(d => d.name), ['get_product']);
  const src = readFileSync('backend/agentBookingHold.ts', 'utf8');
  assert.doesNotMatch(src, /transfers\.create|payouts\.create|sk_live_[A-Za-z0-9]/);
  assert.match(buildNumber('HLD', NOW, 'ab'), /^HLD-20261028-00AB$/);
});
