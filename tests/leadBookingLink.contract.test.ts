import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { applyBookingLink, getLeadPaymentStatus, linkLeadBooking, verifiedAmountUSD, type LinkBookingDeps } from '../backend/leadBookingLink';
import { buildVoucherContent } from '../backend/bookingVoucherService';
import type { LeadRecord } from '../backend/leadPipeline';

const NOW = new Date('2026-10-22T12:00:00.000Z');
const actor = { by: 'owner@example.com' };

function lead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return { id: 'lead_abcdefgh01', status: 'nuevo', statusHistory: [], updatedAt: '2026-10-01T00:00:00.000Z', lastActivityAt: '2026-10-01T00:00:00.000Z', ...overrides } as LeadRecord;
}

const paidBooking = { id: 'bk_paid', bookingId: 'bk_paid', status: 'paid', paymentStatus: 'completed', paymentVerifiedAt: '2026-10-20T10:00:00.000Z', totalUSD: 249.999 };
const pendingBooking = { id: 'bk_pend', bookingId: 'bk_pend', status: 'pending', paymentStatus: 'pending', totalUSD: 120 };
const BOOKINGS: Record<string, any> = { bk_paid: paidBooking, bk_pend: pendingBooking, bk_other: { id: 'bk_other', status: 'pending', paymentStatus: 'pending', totalUSD: 80 } };

function store(initial: LeadRecord | null) {
  let current = initial;
  let writes = 0;
  const lookups: string[] = [];
  const d: LinkBookingDeps = {
    getBooking: async (id) => { lookups.push(id); return BOOKINGS[id] || null; },
    mutateLead: async (id, mutate) => {
      if (!current || current.id !== id) return { ok: false, error: 'not_found', message: 'Lead no encontrado.' };
      const r = mutate(current);
      if (r.ok && r.changed) { current = r.lead; writes += 1; }
      return r;
    },
    now: () => NOW,
  };
  return { d, get: () => current, writes: () => writes, lookups };
}

test('link-booking: enlaza una reserva existente y registra el historial', async () => {
  const s = store(lead());
  const r = await linkLeadBooking('lead_abcdefgh01', { bookingId: 'bk_pend', note: 'cliente confirmó' }, actor, s.d);
  assert.equal(r.status, 200);
  assert.equal(r.body.bookingId, 'bk_pend');
  assert.equal(r.body.changed, true);
  assert.equal(s.get()!.bookingId, 'bk_pend');
  assert.deepEqual(s.get()!.bookingHistory, [{ from: null, to: 'bk_pend', at: NOW.toISOString(), by: actor.by, forced: false, note: 'cliente confirmó' }]);
  assert.equal(s.writes(), 1);
});

test('link-booking: reserva inexistente → 404 sin escribir el lead', async () => {
  const s = store(lead());
  const r = await linkLeadBooking('lead_abcdefgh01', { bookingId: 'bk_missing' }, actor, s.d);
  assert.equal(r.status, 404);
  assert.equal(r.body.error, 'booking_not_found');
  assert.equal(s.writes(), 0);
  assert.equal(s.get()!.bookingId, undefined);
});

test('link-booking: no sobrescribe otra reserva sin force (409)', async () => {
  const s = store(lead({ bookingId: 'bk_pend' }));
  const r = await linkLeadBooking('lead_abcdefgh01', { bookingId: 'bk_other' }, actor, s.d);
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'booking_already_linked');
  assert.equal(s.get()!.bookingId, 'bk_pend');
  assert.equal(s.writes(), 0);
});

test('link-booking: force=true reemplaza y deja constancia forced=true', async () => {
  const s = store(lead({ bookingId: 'bk_pend' }));
  const r = await linkLeadBooking('lead_abcdefgh01', { bookingId: 'bk_other', force: true }, actor, s.d);
  assert.equal(r.status, 200);
  assert.equal(s.get()!.bookingId, 'bk_other');
  const h = s.get()!.bookingHistory!;
  assert.equal(h.length, 1);
  assert.equal(h[0].from, 'bk_pend');
  assert.equal(h[0].to, 'bk_other');
  assert.equal(h[0].forced, true);
});

test('link-booking: misma reserva es idempotente (sin escritura ni historial nuevo)', async () => {
  const s = store(lead({ bookingId: 'bk_pend' }));
  const r = await linkLeadBooking('lead_abcdefgh01', { bookingId: 'bk_pend' }, actor, s.d);
  assert.equal(r.status, 200);
  assert.equal(r.body.changed, false);
  assert.equal(s.writes(), 0);
});

test('link-booking: ids inválidos → 400 sin consultar; lead inexistente → 404', async () => {
  const s = store(lead());
  assert.equal((await linkLeadBooking('../etc', { bookingId: 'bk_pend' }, actor, s.d)).status, 400);
  assert.equal((await linkLeadBooking('lead_abcdefgh01', { bookingId: '../x' }, actor, s.d)).status, 400);
  assert.equal((await linkLeadBooking('lead_abcdefgh01', {}, actor, s.d)).status, 400);
  assert.equal(s.lookups.length, 0);
  const missing = await linkLeadBooking('lead_zzzzzzzz99', { bookingId: 'bk_pend' }, actor, s.d);
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error, 'not_found');
});

test('applyBookingLink: force sin reserva previa no se marca como forzado', () => {
  const r = applyBookingLink(lead(), 'bk_pend', actor, { force: true }, NOW);
  assert.ok(r.ok && r.changed);
  assert.equal(r.ok && r.lead.bookingHistory![0].forced, false);
});

const statusDeps = (l: { id: string; bookingId?: string } | null) => ({
  getLead: async (id: string) => (l && l.id === id ? l : null),
  getBooking: async (id: string) => BOOKINGS[id] || null,
});

test('payment-status: reserva pagada y verificada → monto verificado y voucher elegible', async () => {
  const r = await getLeadPaymentStatus('lead_abcdefgh01', statusDeps({ id: 'lead_abcdefgh01', bookingId: 'bk_paid' }));
  assert.equal(r.status, 200);
  assert.equal(r.body.paymentStatus, 'completed');
  assert.equal(r.body.paymentVerifiedAt, paidBooking.paymentVerifiedAt);
  assert.equal(r.body.montoVerificado, 250);
  assert.equal(r.body.voucherElegible, true);
  assert.equal(r.body.voucherMotivo, null);
});

test('payment-status: reserva pendiente → sin monto verificado, voucher no elegible con motivo', async () => {
  const r = await getLeadPaymentStatus('lead_abcdefgh01', statusDeps({ id: 'lead_abcdefgh01', bookingId: 'bk_pend' }));
  assert.equal(r.status, 200);
  assert.equal(r.body.paymentStatus, 'pending');
  assert.equal(r.body.paymentVerifiedAt, null);
  assert.equal(r.body.montoVerificado, null);
  assert.equal(r.body.voucherElegible, false);
  assert.equal(typeof r.body.voucherMotivo, 'string');
});

test('payment-status: elegibilidad idéntica a la regla de download-pdf (buildVoucherContent)', async () => {
  const cases = [
    paidBooking,
    pendingBooking,
    { ...paidBooking, paymentVerifiedAt: undefined },
    { ...paidBooking, totalUSD: 0 },
    { ...paidBooking, status: 'cancelled' },
    { ...paidBooking, paymentStatus: 'pending' },
  ];
  for (const [i, b] of cases.entries()) {
    const id = `bk_case_${i}`;
    const r = await getLeadPaymentStatus('lead_abcdefgh01', {
      getLead: async () => ({ id: 'lead_abcdefgh01', bookingId: id }),
      getBooking: async () => b,
    });
    assert.equal(r.body.voucherElegible, buildVoucherContent(b) !== null, `caso ${i}`);
  }
});

test('payment-status: lead sin reserva → 409; lead inexistente → 404; reserva borrada → 404', async () => {
  assert.equal((await getLeadPaymentStatus('lead_abcdefgh01', statusDeps({ id: 'lead_abcdefgh01' }))).status, 409);
  assert.equal((await getLeadPaymentStatus('lead_abcdefgh01', statusDeps(null))).status, 404);
  const gone = await getLeadPaymentStatus('lead_abcdefgh01', statusDeps({ id: 'lead_abcdefgh01', bookingId: 'bk_gone' }));
  assert.equal(gone.status, 404);
  assert.equal(gone.body.error, 'booking_not_found');
  assert.equal((await getLeadPaymentStatus('../x', statusDeps(null))).status, 400);
});

test('cableado: ambas rutas exigen requireOwner; payment-status es solo lectura; sin Stripe ni webhook', () => {
  const src = fs.readFileSync('backend/routes/leads.ts', 'utf8');
  assert.match(src, /\.post\('\/api\/admin\/leads\/:id\/link-booking',\s*requireOwner,/);
  assert.match(src, /\.get\('\/api\/admin\/leads\/:id\/payment-status',\s*requireOwner,/);
  const lib = fs.readFileSync('backend/leadBookingLink.ts', 'utf8');
  assert.doesNotMatch(lib, /from '\.\/(paymentWebhook|paymentWebhookService|stripeModeGuard)'|new Stripe\(|updateBookingStatus|\.set\(|\.update\(/);
  const statusFn = lib.slice(lib.indexOf('export async function getLeadPaymentStatus'));
  assert.doesNotMatch(statusFn, /mutateLead|\.set\(|\.update\(/);
  assert.match(lib, /buildVoucherContent\(booking\) !== null/);
});

for (const [method, path] of [['POST', 'link-booking'], ['GET', 'payment-status']] as const) {
  test(`HTTP ${method} ${path}: sin sesión de owner se rechaza (401/403/503)`, async () => {
    const { createApp } = await import('../backend/app');
    const server = createApp().listen(0);
    try {
      const { port } = server.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${port}/api/admin/leads/lead_abcdefgh01/${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify({ bookingId: 'bk_paid', force: true }) } : {}),
      });
      assert.ok([401, 403, 503].includes(res.status), `status inesperado ${res.status}`);
      const body = await res.json();
      assert.equal(body.bookingId, undefined);
      assert.equal(body.paymentStatus, undefined);
    } finally {
      server.close();
    }
  });
}
