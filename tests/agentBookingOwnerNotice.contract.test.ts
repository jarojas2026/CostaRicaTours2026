/**
 * Contrato: aviso al dueño de cada reserva del asistente (`agent_bookings`, pendiente_pago),
 * texto prellenado de WhatsApp con el código AGB, y lista de solo lectura para el dueño.
 * Todo offline: Firestore falso en memoria, alertas inyectadas, sin red ni correo real.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AGENT_BOOKING_COLLECTION, confirmBooking, holdBooking } from '../backend/agentBookingHold';
import { hashIdentifier } from '../backend/agentEventLog';
import {
  AGENT_BOOKING_ALERT_SOURCE,
  AGENT_BOOKING_CREATED_EVENT,
  buildAgentBookingOwnerNotice,
  listAgentBookings,
  notifyOwnerOfAgentBooking,
  toAgentBookingView,
} from '../backend/agentBookingOwnerNotice';
import { holdStageQuickActions } from '../backend/bookingFunnelHold';
import { emptyConversationState } from '../backend/conversationState';
import { buildAgentBookingWhatsAppText } from '../shared/agentBookingWhatsApp';

const NOW = new Date('2026-10-28T20:00:00-06:00');
const SESSION = 'web_chat_owner_notice_1';
const SUPPLIER = 'Rafting Secreto S.A.';
const TOUR_ID = 'sjo-3-in-1-combo';
const FORBIDDEN = /Rafting Secreto|secret-op|supplierCost|supplierName|margin|sessionIdHash|web_chat_owner_notice_1/i;

function fakeDb(seed: Record<string, Array<Record<string, any>>> = {}) {
  const cols: Record<string, Array<{ id: string; data: Record<string, any> }>> = {};
  let n = 0;
  for (const [name, docs] of Object.entries(seed)) cols[name] = docs.map(d => ({ id: `seed${++n}`, data: d }));
  return {
    cols,
    collection: (name: string) => ({
      add: async (doc: Record<string, any>) => { (cols[name] ||= []).push({ id: `doc${++n}`, data: doc }); return { id: `doc${n}` }; },
      where: (field: string, _op: '==', value: unknown) => ({ limit: (k: number) => ({ get: async () => {
        const docs = (cols[name] || []).filter(d => d.data[field] === value).slice(0, k).map(d => ({ id: d.id, exists: true, data: () => d.data }));
        return { size: docs.length, empty: !docs.length, docs };
      } }) }),
      orderBy: (field: string, _dir: 'desc') => ({ limit: (k: number) => ({ get: async () => ({
        docs: [...(cols[name] || [])].sort((a, b) => String(b.data[field]).localeCompare(String(a.data[field]))).slice(0, k).map(d => ({ id: d.id, data: () => d.data })),
      }) }) }),
    }),
  };
}

const quote = () => ({
  quoteNumber: 'QTE-20261028-AB12', status: 'quoted', tourId: TOUR_ID, date: '2026-12-01', pax: 2,
  clientPriceUSD: 290, sessionIdHash: hashIdentifier('session', SESSION), expiresAt: '2026-10-30T14:00:00-06:00',
  internal: { providerId: 'secret-op', supplierName: SUPPLIER, supplierCostUSD: 200, marginUSD: 90 },
});

async function heldDb() {
  const db = fakeDb({ agent_quotes: [quote()] });
  const h: any = await holdBooking({ quoteNumber: 'QTE-20261028-AB12' }, { sessionId: SESSION, language: 'en' }, { db, now: () => NOW, randomHex: () => 'beef' });
  return { db, holdNumber: h.holdNumber as string };
}

test('confirm_booking avisa al dueño UNA vez por reserva nueva, con lista blanca (sin proveedor ni sesión)', async () => {
  const { db, holdNumber } = await heldDb();
  const alerts: any[] = [];
  const logs: string[] = [];
  const notifyOwner = (b: any) => notifyOwnerOfAgentBooking(b, { createAlert: async a => { alerts.push(a); }, log: l => logs.push(l) });
  const deps = { db, now: () => NOW, randomHex: () => 'a1b2', notifyOwner };
  const r: any = await confirmBooking({ holdNumber }, { sessionId: SESSION, userMessage: 'Yes, I confirm', language: 'en' }, deps);
  assert.equal(r.success, true);
  assert.equal(r.bookingNumber, 'AGB-20261028-A1B2');
  assert.equal(alerts.length, 1);
  const a = alerts[0];
  assert.equal(a.source, AGENT_BOOKING_ALERT_SOURCE);
  assert.match(a.title, /AGB-20261028-A1B2/);
  assert.match(a.message, /Reserva: AGB-20261028-A1B2/);
  assert.match(a.message, /Tour: Combo 3-en-1.*\(sjo-3-in-1-combo\)/);
  assert.match(a.message, /Fecha: 2026-12-01/);
  assert.match(a.message, /Personas: 2/);
  assert.match(a.message, /Total cotizado: USD 290\.00/);
  assert.match(a.message, /Idioma del cliente: inglés \(en\)/);
  assert.equal(a.metadata.bookingNumber, 'AGB-20261028-A1B2');
  assert.equal(a.metadata.language, 'en');
  assert.doesNotMatch(JSON.stringify(a), FORBIDDEN);
  assert.equal(logs.length, 1);
  assert.equal(JSON.parse(logs[0]).event, AGENT_BOOKING_CREATED_EVENT);
  assert.doesNotMatch(logs[0], FORBIDDEN);
  // Reutilizada (idempotente): no vuelve a avisar.
  const again: any = await confirmBooking({ holdNumber }, { sessionId: SESSION, userMessage: 'Yes, I confirm' }, deps);
  assert.equal(again.reused, true);
  assert.equal(alerts.length, 1);
});

test('si el aviso falla, la reserva sigue creada y confirm_booking no falla', async () => {
  const { db, holdNumber } = await heldDb();
  const r: any = await confirmBooking({ holdNumber }, { sessionId: SESSION, userMessage: 'Sí, confirmo' }, {
    db, now: () => NOW, randomHex: () => 'a1b2', notifyOwner: async () => { throw new Error('smtp caído'); },
  });
  assert.equal(r.success, true);
  assert.equal(db.cols[AGENT_BOOKING_COLLECTION].length, 1);
  // createAlert que falla ⇒ queda solo el log.
  const res = await notifyOwnerOfAgentBooking({ bookingNumber: 'AGB-20261028-A1B2', tourId: TOUR_ID }, { createAlert: async () => { throw new Error('x'); }, log: () => {} });
  assert.deepEqual(res, { notified: false, channel: 'log_only' });
  // Código inválido ⇒ no avisa.
  let called = 0;
  await notifyOwnerOfAgentBooking({ bookingNumber: 'XYZ' } as any, { createAlert: async () => { called++; }, log: () => {} });
  assert.equal(called, 0);
});

test('el aviso reutiliza alertService (admin_alerts + correo SMTP opcional) y no agrega servicios pagos', () => {
  const src = readFileSync('backend/agentBookingOwnerNotice.ts', 'utf8');
  assert.match(src, /import\('\.\/alertService'\)\)\.createAlert/);
  assert.doesNotMatch(src, /twilio|sendgrid|resend|mailgun|telegram|hooks\.slack|stripe|fetch\(/i);
  const hold = readFileSync('backend/agentBookingHold.ts', 'utf8');
  assert.match(hold, /await notifyOwnerSafely\(bookingDoc, deps\)/);
  assert.doesNotMatch(hold, /stripe|checkout\.sessions|payment_link|paymentUrl/i);
  // Sin proveedor aunque el catálogo tuviera nombre de operador en el título.
  const n = buildAgentBookingOwnerNotice({ bookingNumber: 'AGB-20261028-A1B2', tourId: 'no-existe', date: '2026-12-01', pax: 3, totalPrice: 10, currency: 'USD', language: 'es' });
  assert.match(n.message, /Tour: no-existe/);
  assert.match(n.message, /Idioma del cliente: español \(es\)/);
});

test('WhatsApp prellenado: código AGB, tour, fecha y personas (es/en); sin código válido no hay texto', () => {
  const es = buildAgentBookingWhatsAppText({ bookingNumber: 'agb-20261028-a1b2', tourTitle: 'Combo 3-en-1', date: '2026-12-01', pax: 2, language: 'es' })!;
  assert.equal(es, 'Hola Costa Rica Tours, tengo la reserva AGB-20261028-A1B2 (pendiente de pago): Combo 3-en-1, fecha 2026-12-01, 2 personas. Quisiera recibir las instrucciones de pago.');
  const en = buildAgentBookingWhatsAppText({ bookingNumber: 'AGB-20261028-A1B2', tourTitle: 'Combo', date: '2026-12-01', pax: 1, language: 'en' })!;
  assert.match(en, /booking AGB-20261028-A1B2 \(pending payment\): Combo, date 2026-12-01, 1 person\./);
  assert.equal(buildAgentBookingWhatsAppText({ bookingNumber: 'HLD-20261028-A1B2' }), null);
  assert.match(buildAgentBookingWhatsAppText({ bookingNumber: 'AGB-20261028-A1B2', date: 'mañana', pax: -1 })!, /AGB-20261028-A1B2 \(pendiente de pago\)\. Quisiera/);
});

test('acción rápida de WhatsApp de la reserva lleva código, tour, fecha y personas; el chat la usa', () => {
  let s = emptyConversationState(NOW);
  s = { ...s, extra: { ...(s.extra || {}), funnel: {
    quote: { quoteNumber: 'QTE-20261028-AB12', tourId: TOUR_ID, date: '2026-12-01', pax: 2, currency: 'USD', unitPrice: 145, totalPrice: 290, expiresAt: '2026-10-30T14:00:00-06:00' },
    hold: { holdNumber: 'HLD-20261028-BEEF', quoteNumber: 'QTE-20261028-AB12', totalPrice: 290, currency: 'USD', expiresAt: '2026-10-28T21:00:00-06:00' },
    booking: { bookingNumber: 'AGB-20261028-A1B2', holdNumber: 'HLD-20261028-BEEF', status: 'pendiente_pago', paymentStatus: 'awaiting_payment_instructions', totalPrice: 290, currency: 'USD' },
  } } } as any;
  const [wa] = holdStageQuickActions(s, 'es');
  assert.equal(wa.action, 'direct_whatsapp');
  assert.equal(wa.data.bookingNumber, 'AGB-20261028-A1B2');
  assert.match(wa.data.tourTitle, /Combo 3-en-1/);
  assert.equal(wa.data.date, '2026-12-01');
  assert.equal(wa.data.pax, 2);
  assert.match(wa.data.whatsappText, /AGB-20261028-A1B2.*Combo 3-en-1.*fecha 2026-12-01.*2 personas/);
  assert.doesNotMatch(JSON.stringify(wa), /https?:\/\/|secret-op|margin/i);
  const ui = readFileSync('src/components/AIAssistant.tsx', 'utf8');
  assert.match(ui, /qa\.action === 'direct_whatsapp' && qa\.data\?\.bookingNumber && buildAgentBookingWhatsAppText/);
  assert.match(ui, /window\.open\(directWhatsAppUrl\(text\)/);
});

test('lista del dueño: solo lectura, más nuevas primero, lista blanca y endpoint requireOwner', async () => {
  const db = fakeDb({ [AGENT_BOOKING_COLLECTION]: [
    { bookingNumber: 'AGB-20261027-0001', status: 'pendiente_pago', tourId: TOUR_ID, date: '2026-11-20', pax: 1, totalPrice: 100, currency: 'USD', language: 'es', timestamp: '2026-10-27T10:00:00.000Z', sessionIdHash: 'h', supplierPayout: 'manual_owner_only', internal: { supplierName: SUPPLIER } },
    { bookingNumber: 'AGB-20261028-0002', status: 'pendiente_pago', tourId: TOUR_ID, date: '2026-12-01', pax: 2, totalPrice: 290, currency: 'USD', language: 'en', timestamp: '2026-10-28T10:00:00.000Z', sessionIdHash: 'h2' },
  ] });
  const r: any = await listAgentBookings({ limit: 10 }, { db: db as any });
  assert.equal(r.ok, true);
  assert.deepEqual(r.bookings.map((b: any) => b.bookingNumber), ['AGB-20261028-0002', 'AGB-20261027-0001']);
  assert.match(r.bookings[0].tourTitle, /Combo 3-en-1/);
  assert.doesNotMatch(JSON.stringify(r), FORBIDDEN);
  assert.doesNotMatch(JSON.stringify(r), /supplierPayout|internal/);
  assert.deepEqual(Object.keys(toAgentBookingView('x', {})).sort(), ['bookingNumber', 'channel', 'createdAt', 'currency', 'date', 'id', 'language', 'pax', 'paymentInstructionsSent', 'paymentStatus', 'status', 'supplierVerified', 'totalPrice', 'tourId', 'tourTitle'].sort());
  assert.deepEqual(await listAgentBookings({}, { db: null }), { ok: false, error: 'storage_unavailable' });
  const routes = readFileSync('backend/routes/leads.ts', 'utf8');
  assert.match(routes, /leadsRouter\.get\('\/api\/admin\/agent-bookings', requireOwner,/);
  assert.doesNotMatch(routes, /leadsRouter\.(post|patch|put|delete)\('\/api\/admin\/agent-bookings/);
  const page = readFileSync('src/pages/LeadsPipelinePage.tsx', 'utf8');
  assert.match(page, /<AgentBookingsPanel es=\{es\} \/>/);
  const panel = readFileSync('src/components/AgentBookingsPanel.tsx', 'utf8');
  assert.match(panel, /fetch\('\/api\/admin\/agent-bookings\?limit=50'/);
  assert.doesNotMatch(panel, /method:\s*'(POST|PATCH|PUT|DELETE)'/);
});
