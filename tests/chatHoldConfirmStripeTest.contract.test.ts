/**
 * Contrato: hold_booking / confirm_booking conectados al chat del cliente (embudo #484) y
 * conciliación del webhook Stripe TEST de las reservas creadas por confirm_booking.
 * Todo offline: Firestore falso en memoria, checkout de Stripe inyectado, sin red.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Stripe from 'stripe';
import { applyUserTurn, emptyConversationState, type ConversationState } from '../backend/conversationState';
import { FUNNEL_TOOLS, FUNNEL_TOOL_NAMES, runFunnelTurn, shouldRunFunnel, withFunnel } from '../backend/bookingFunnel';
import { detectReserveRequest, getHoldStage, safePaymentUrl } from '../backend/bookingFunnelHold';
import { AGENT_BOOKING_COLLECTION, AGENT_HOLD_COLLECTION, HOLD_DURATION_MINUTES, confirmBooking, holdBooking } from '../backend/agentBookingHold';
import { isAgentBookingSession, reconcileAgentBookingPayment } from '../backend/agentBookingPayment';
import { hashIdentifier } from '../backend/agentEventLog';
import { COMPAT_READ_ONLY_TOOLS } from '../backend/compatConcierge';

const NOW = new Date('2026-10-28T20:00:00-06:00');
const SESSION = 'web_chat_session_hold_1';
const SUPPLIER = 'Rafting Secreto S.A.';
const QUOTE_NUMBER = 'QTE-20261028-AB12';
const PAY_URL = 'https://checkout.stripe.com/c/pay/cs_test_chat_1';
const testMode = () => ({ mode: 'test' as const, blocked: false });

/** Firestore falso: add, where('==').limit().get(), doc().update y runTransaction. */
function fakeDb(seed: Record<string, Array<Record<string, any>>> = {}) {
  const cols: Record<string, Array<{ id: string; data: Record<string, any> }>> = {};
  let n = 0;
  let writes = 0;
  for (const [name, docs] of Object.entries(seed)) cols[name] = docs.map(d => ({ id: `seed${++n}`, data: d }));
  const refOf = (name: string, id: string) => ({
    get: async () => { const d = (cols[name] || []).find(x => x.id === id); return { exists: Boolean(d), data: () => d?.data }; },
    update: async (patch: Record<string, any>) => { const d = (cols[name] || []).find(x => x.id === id); if (!d) throw new Error('nf'); writes++; Object.assign(d.data, patch); },
  });
  const db = {
    cols,
    writes: () => writes,
    collection: (name: string) => ({
      add: async (doc: Record<string, any>) => { (cols[name] ||= []).push({ id: `doc${++n}`, data: doc }); return { id: `doc${n}` }; },
      doc: (id: string) => refOf(name, id),
      where: (field: string, _op: '==', value: unknown) => ({ limit: (k: number) => ({ get: async () => {
        const docs = (cols[name] || []).filter(d => d.data[field] === value).slice(0, k).map(d => ({ id: d.id, exists: true, data: () => d.data, ref: refOf(name, d.id) }));
        return { size: docs.length, empty: !docs.length, docs };
      } }) }),
    }),
    runTransaction: async (fn: (tx: any) => Promise<any>) => fn({ get: (ref: any) => ref.get(), update: (ref: any, patch: any) => { void ref.update(patch); } }),
  };
  return db;
}

const quoteDoc = (over: Record<string, any> = {}) => ({
  quoteNumber: QUOTE_NUMBER, status: 'quoted', tourId: 'sjo-3-in-1-combo', date: '2026-12-01', pax: 2,
  clientPriceUSD: 290, sessionIdHash: hashIdentifier('session', SESSION), expiresAt: '2026-10-30T20:00:00.000Z',
  internal: { providerId: 'secret-op', supplierName: SUPPLIER, supplierCostUSD: 200, marginUSD: 90 }, ...over,
});

/** Estado de conversación con la cotización ya presentada al cliente (turno anterior). */
function quotedState(): ConversationState {
  let s = emptyConversationState(NOW);
  s = applyUserTurn(s, 'Quiero reservar en Arenal el 2026-12-01, somos 2', NOW, 'es');
  s = { ...s, slots: { ...s.slots, zone: 'arenal', date: '2026-12-01', pax: 2, language: 'es' } };
  return withFunnel(s, {
    active: false,
    recommended: [],
    selectedTourId: 'sjo-3-in-1-combo',
    quote: { quoteNumber: QUOTE_NUMBER, tourId: 'sjo-3-in-1-combo', date: '2026-12-01', pax: 2, currency: 'USD', unitPrice: 145, totalPrice: 290, expiresAt: '2026-10-30T20:00:00.000Z' },
    lastAsked: 'done',
  });
}

function harness() {
  const db = fakeDb({ agent_quotes: [quoteDoc()] });
  const checkout: any[] = [];
  let hex = 0;
  const clock = { now: NOW };
  const now = () => clock.now;
  const deps = {
    now,
    holdBooking: (i: any, c: any) => holdBooking(i, c, { db, now, randomHex: () => ['c0de', 'beef'][hex++ % 2] }),
    confirmBooking: (i: any, c: any) => confirmBooking(i, c, {
      db, now, randomHex: () => 'a1b2', stripeMode: testMode,
      createCheckoutSession: async (p: any) => { checkout.push(p); return { id: 'cs_test_chat_1', url: PAY_URL }; },
    }),
  };
  return { db, checkout, deps, clock };
}

async function turn(state: ConversationState, message: string, deps: any, now = NOW) {
  const s = applyUserTurn(state, message, now, 'es');
  return runFunnelTurn({ message, language: 'es', state: s, sessionId: SESSION }, deps);
}

// ---------------------------------------------------------------------------

test('herramientas expuestas: hold_booking y confirm_booking en las herramientas Groq del embudo y en su despacho', async () => {
  const names = FUNNEL_TOOLS.map(t => t.function.name);
  assert.ok(names.includes('hold_booking'));
  assert.ok(names.includes('confirm_booking'));
  assert.ok((FUNNEL_TOOL_NAMES as readonly string[]).includes('hold_booking'));
  assert.ok((FUNNEL_TOOL_NAMES as readonly string[]).includes('confirm_booking'));
  const confirmTool = FUNNEL_TOOLS.find(t => t.function.name === 'confirm_booking')!;
  assert.match(confirmTool.function.description, /explicitly confirms/);
  // El modelo recibe las herramientas y su llamada a hold_booking se despacha (con la cotización del estado).
  const { db, deps } = harness();
  const seen: string[][] = [];
  let call = 0;
  const chat = async ({ tools }: any) => {
    seen.push((tools || []).map((t: any) => t.function.name));
    call++;
    if (call === 1) return { model: 'groq-mock', choices: [{ message: { content: null, tool_calls: [{ id: 't1', type: 'function', function: { name: 'hold_booking', arguments: '{}' } }] } }] };
    return { model: 'groq-mock', choices: [{ message: { content: 'Listo, aparté tu cotización sin cobro. ¿Confirmas?' } }] };
  };
  const out = await turn(quotedState(), 'me interesa, ¿qué sigue?', { ...deps, chat });
  assert.ok(seen[0].includes('hold_booking') && seen[0].includes('confirm_booking'));
  assert.ok(out.toolCalls.some(c => c.name === 'hold_booking' && c.ok));
  assert.equal(db.cols[AGENT_HOLD_COLLECTION].length, 1);
  // Cableado: la ruta Gemini/respaldo pasa la sesión y el mensaje literal; Groq genérico sigue de solo lectura.
  const svc = readFileSync('backend/aiAssistantService.ts', 'utf8');
  assert.match(svc, /executeAgentTool\(toolName as any, call\.args \|\| \{\}, \{\s*sessionId,\s*userMessage: message,/);
  assert.match(svc, /toolName === 'confirm_booking' && heldThisTurn/);
  assert.ok(!(COMPAT_READ_ONLY_TOOLS as readonly string[]).includes('confirm_booking'));
  // El embudo atiende el "Sí, confirmo" cuando hay un apartado pendiente.
  assert.equal(shouldRunFunnel(out.state, 'Sí, confirmo'), true);
});

test('flujo completo: cotización → reservar → apartado sin cobro → "Sí, confirmo" → reserva pendiente + botón de pago TEST', async () => {
  const { db, checkout, deps } = harness();
  assert.equal(detectReserveRequest('Sí, quiero reservarlo'), true);
  assert.equal(detectReserveRequest('todavía no quiero reservar'), false);

  const t1 = await turn(quotedState(), 'Perfecto, quiero reservarlo', deps);
  const hold = getHoldStage(t1.state).hold!;
  assert.match(hold.holdNumber, /^HLD-20261028-[A-F0-9]{4}$/);
  assert.equal(Date.parse(hold.expiresAt) - NOW.getTime(), HOLD_DURATION_MINUTES * 60_000);
  assert.equal(db.cols[AGENT_HOLD_COLLECTION][0].data.charged, false);
  assert.equal(checkout.length, 0);
  assert.match(t1.reply, /No se ha cobrado nada/);
  assert.match(t1.reply, /Sí, confirmo/);
  assert.ok(t1.quickActions.some(q => q.action === 'send_message' && q.data?.message === 'Sí, confirmo'));

  const t2 = await turn(t1.state, 'Sí, confirmo', deps);
  const booking = getHoldStage(t2.state).booking!;
  assert.match(booking.bookingNumber, /^AGB-20261028-A1B2$/);
  assert.equal(checkout.length, 1);
  assert.equal(checkout[0].amountCents, 29000);
  assert.equal(checkout[0].metadata.source, 'agent_confirm_booking');
  const stored = db.cols[AGENT_BOOKING_COLLECTION][0].data;
  assert.equal(stored.status, 'pending_supplier_verification');
  assert.equal(stored.stripeMode, 'test');
  assert.match(t2.reply, /PENDIENTE/);
  assert.doesNotMatch(t2.reply, /confirmada|pagada|https?:\/\//i);
  const pay = t2.quickActions.find(q => q.action === 'open_payment_link');
  assert.equal(pay?.data?.url, PAY_URL);
  assert.equal(pay?.data?.mode, 'test');
  // Repetir la confirmación no crea otro enlace.
  await turn(t2.state, 'Sí, confirmo', deps);
  assert.equal(checkout.length, 1);
  // Solo URLs https de checkout.stripe.com llegan como botón.
  assert.equal(safePaymentUrl('https://evil.example/pay'), null);
  assert.equal(safePaymentUrl('http://checkout.stripe.com/x'), null);
});

test('nunca confirm_booking sin confirmación explícita (servidor y modelo)', async () => {
  const { checkout, deps } = harness();
  // Mismo turno: pedir reservar y "confirmar" a la vez ⇒ solo se aparta (el cliente aún no vio el resumen).
  const same = await turn(quotedState(), 'Quiero reservarlo, sí confirmo', deps);
  assert.ok(getHoldStage(same.state).hold);
  assert.equal(getHoldStage(same.state).booking, undefined);
  assert.equal(checkout.length, 0);

  // Mensajes que no son confirmación explícita.
  for (const msg of ['ok', '¿y a qué hora sale?', 'no confirmo todavía', 'tal vez mañana']) {
    const out = await turn(same.state, msg, deps);
    assert.equal(getHoldStage(out.state).booking, undefined, msg);
  }
  assert.equal(checkout.length, 0);

  // El modelo intenta confirm_booking por su cuenta: el servidor lo rechaza.
  const results: string[] = [];
  let call = 0;
  const chat = async ({ messages }: any) => {
    call++;
    if (call === 1) return { choices: [{ message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'confirm_booking', arguments: JSON.stringify({ holdNumber: getHoldStage(same.state).hold!.holdNumber }) } }] } }] };
    results.push(String(messages[messages.length - 1]?.content || ''));
    return { choices: [{ message: { content: '¿Me confirmas con "Sí, confirmo"?' } }] };
  };
  const forced = await turn(same.state, 'ok, suena bien', { ...deps, chat });
  assert.match(results[0], /explicit_confirmation_required/);
  assert.equal(getHoldStage(forced.state).booking, undefined);
  assert.ok(forced.toolCalls.some(c => c.name === 'confirm_booking' && !c.ok));
  assert.equal(checkout.length, 0);
});

test('apartado vencido: se rechaza, no se crea enlace y se ofrece apartar de nuevo', async () => {
  const { checkout, deps, clock } = harness();
  const t1 = await turn(quotedState(), 'quiero reservarlo', deps);
  assert.ok(getHoldStage(t1.state).hold);
  clock.now = new Date(NOW.getTime() + (HOLD_DURATION_MINUTES + 1) * 60_000);
  const out = await turn(t1.state, 'Sí, confirmo', deps, clock.now);
  assert.equal(checkout.length, 0, 'sin enlace con apartado vencido');
  assert.ok(out.toolCalls.some(c => c.name === 'confirm_booking' && !c.ok));
  assert.equal(getHoldStage(out.state).hold, undefined);
  assert.equal(getHoldStage(out.state).booking, undefined);
  assert.match(out.reply, /venció/);
  assert.ok(!out.quickActions.some(q => q.action === 'open_payment_link'));
  // Se puede apartar de nuevo (nuevo número, sin cobro).
  const again = await turn(out.state, 'quiero reservarlo otra vez', deps, clock.now);
  assert.ok(getHoldStage(again.state).hold);
  assert.notEqual(getHoldStage(again.state).hold!.holdNumber, getHoldStage(t1.state).hold!.holdNumber);
});

// ---------------------------------------------------------------------------
// Webhook Stripe TEST
// ---------------------------------------------------------------------------

function bookedDb(over: Record<string, any> = {}) {
  return fakeDb({
    [AGENT_BOOKING_COLLECTION]: [{
      bookingNumber: 'AGB-20261028-A1B2', status: 'pending_supplier_verification', paymentStatus: 'payment_link_created',
      stripeMode: 'test', checkoutSessionId: 'cs_test_chat_1', totalPrice: 290, currency: 'USD',
      supplierVerified: false, supplierPayout: 'manual_owner_only', internal: { supplierName: SUPPLIER }, ...over,
    }],
  });
}

const paidSession = (over: Record<string, any> = {}) => ({
  id: 'cs_test_chat_1', livemode: false, payment_status: 'paid', currency: 'usd', amount_total: 29000, payment_intent: 'pi_test_1',
  metadata: { source: 'agent_confirm_booking', agentBookingNumber: 'AGB-20261028-A1B2', holdNumber: 'HLD-20261028-C0DE', quoteNumber: QUOTE_NUMBER },
  ...over,
});

test('webhook: concilia la reserva de confirm_booking como pagada (TEST), idempotente y sin confirmarla', async () => {
  const db = bookedDb();
  const deps = { db, now: () => NOW, stripeMode: testMode };
  assert.equal(isAgentBookingSession(paidSession()), true);
  assert.equal(isAgentBookingSession({ metadata: { bookingId: 'CRT-1' } }), false);

  const r1: any = await reconcileAgentBookingPayment(paidSession(), { eventId: 'evt_1', via: 'webhook' }, deps);
  assert.equal(r1.success, true);
  assert.equal(r1.duplicate, false);
  const doc = db.cols[AGENT_BOOKING_COLLECTION][0].data;
  assert.equal(doc.paymentStatus, 'paid');
  assert.equal(doc.paymentMode, 'test');
  assert.equal(doc.status, 'pending_supplier_verification');
  assert.equal(doc.supplierVerified, false);
  assert.equal(doc.ownerVerificationRequired, true);
  assert.equal(doc.supplierPayout, 'manual_owner_only');
  assert.equal(doc.paymentEvidence.webhookEventId, 'evt_1');
  assert.equal(db.writes(), 1);

  // Reentrega (mismo u otro evento): sin escribir de nuevo.
  const r2: any = await reconcileAgentBookingPayment(paidSession(), { eventId: 'evt_1', via: 'webhook' }, deps);
  const r3: any = await reconcileAgentBookingPayment(paidSession(), { via: 'return' }, deps);
  assert.equal(r2.duplicate, true);
  assert.equal(r3.duplicate, true);
  assert.equal(db.writes(), 1);
  assert.equal(doc.paymentEvidence.webhookEventId, 'evt_1');
});

test('webhook: rechaza importe/sesión/moneda distintos, pagos no completados y modo en vivo', async () => {
  const cases: Array<[Record<string, any>, string, (() => any)?]> = [
    [{ amount_total: 100 }, 'amount_mismatch'],
    [{ id: 'cs_test_other' }, 'session_mismatch'],
    [{ currency: 'crc' }, 'currency_mismatch'],
    [{ payment_status: 'unpaid' }, 'payment_not_completed'],
    [{ livemode: true }, 'stripe_test_only'],
    [{}, 'stripe_test_only', () => ({ mode: 'live', blocked: false })],
    [{}, 'stripe_live_blocked', () => ({ mode: 'live', blocked: true })],
  ];
  for (const [over, error, mode] of cases) {
    const db = bookedDb();
    const r: any = await reconcileAgentBookingPayment(paidSession(over), { eventId: 'evt_x', via: 'webhook' }, { db, now: () => NOW, stripeMode: mode ?? testMode });
    assert.equal(r.success, false, error);
    assert.equal(r.error, error);
    assert.equal(db.writes(), 0, error);
    assert.equal(db.cols[AGENT_BOOKING_COLLECTION][0].data.paymentStatus, 'payment_link_created');
  }
  assert.equal((await reconcileAgentBookingPayment(paidSession(), { via: 'webhook' }, { db: null, stripeMode: testMode }) as any).error, 'storage_unavailable');
});

test('webhook: firma verificada; el evento del asistente va a su conciliación y no avanza el ciclo de vida', async () => {
  const prev = { key: process.env.STRIPE_SECRET_KEY, secret: process.env.STRIPE_WEBHOOK_SECRET, allow: process.env.ALLOW_STRIPE_LIVE };
  process.env.STRIPE_SECRET_KEY = 'sk_test_contract_only';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_contract_only';
  try {
    const { processStripeWebhook } = await import('../backend/paymentWebhookService');
    const payload = JSON.stringify({ id: 'evt_test_agent_1', object: 'event', type: 'checkout.session.completed', data: { object: paidSession() } });
    // Firma inválida ⇒ rechazado antes de tocar datos.
    await assert.rejects(processStripeWebhook(Buffer.from(payload), 't=1,v1=bad'), /Firma Stripe no válida/);
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_contract_only' });
    // Offline (sin Firestore): llega a la rama del asistente (no a la de bookingId) y no concilia nada.
    await assert.rejects(processStripeWebhook(Buffer.from(payload), header), /Reserva del asistente no conciliada: storage_unavailable/);
  } finally {
    for (const [k, v] of [['STRIPE_SECRET_KEY', prev.key], ['STRIPE_WEBHOOK_SECRET', prev.secret], ['ALLOW_STRIPE_LIVE', prev.allow]] as const) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
  const svc = readFileSync('backend/paymentWebhookService.ts', 'utf8');
  assert.match(svc, /isAgentBookingSession\(session\)/);
  assert.match(svc, /return \{ accepted: true, eventId: event\.id, agentBookingNumber: agent\.bookingNumber/);
  assert.match(readFileSync('backend/routes/payments.ts', 'utf8'), /reconcileAgentBookingPayment\(session, \{ via: 'return' \}\)/);
  const lib = readFileSync('backend/agentBookingPayment.ts', 'utf8');
  assert.doesNotMatch(lib, /transfers\.create|payouts\.create|process\.env\.ALLOW_STRIPE_LIVE\s*=[^=]|sk_live_[A-Za-z0-9]|supplierVerified:\s*true|'confirmada'/);
});

// ---------------------------------------------------------------------------
// Privacidad
// ---------------------------------------------------------------------------

test('el nombre del proveedor nunca sale: respuestas, herramientas, botones ni conciliación', async () => {
  const { deps } = harness();
  const toolOutputs: string[] = [];
  const chat = async ({ messages }: any) => {
    const last = messages[messages.length - 1];
    if (last?.role === 'tool') toolOutputs.push(String(last.content));
    return { choices: [{ message: { content: `Apartado listo con ${SUPPLIER} (www.raftingsecreto.cr, +506 8888-1234). Sin cobro. Responde "Sí, confirmo".` } }] };
  };
  const t1 = await turn(quotedState(), 'quiero reservarlo', { ...deps, chat });
  const t2 = await turn(t1.state, 'Sí, confirmo', { ...deps, chat });
  const r: any = await reconcileAgentBookingPayment(paidSession(), { eventId: 'evt_p', via: 'webhook' }, { db: bookedDb(), now: () => NOW, stripeMode: testMode });
  const everything = JSON.stringify({ t1: [t1.reply, t1.quickActions, t1.toolCalls], t2: [t2.reply, t2.quickActions, t2.toolCalls], toolOutputs, r, stage: getHoldStage(t2.state) });
  assert.doesNotMatch(everything, /Rafting Secreto|raftingsecreto|8888-1234|secret-op|supplierCost|supplierName|margin/i);
  assert.match(t2.reply, /nuestro operador local|operador local/);
});
