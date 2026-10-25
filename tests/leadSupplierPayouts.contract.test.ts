import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import {
  SUPPLIER_PAYOUT_STATES, applyApproveSupplierPayout, applyCancelSupplierPayout, applyCreateSupplierPayout,
  applyMarkSupplierPayoutPaid, approveSupplierPayout, canTransitionSupplierPayout, cancelSupplierPayout,
  createSupplierPayout, listSupplierPayouts, markSupplierPayoutPaid, parseCreateInput, parseMarkPaidInput,
  type SupplierPayoutActor, type SupplierPayoutDeps,
} from '../backend/leadSupplierPayouts';
import type { LeadRecord } from '../backend/leadPipeline';
import { LEGAL_PAGES } from '../src/data/legalPages';
import { describeSupplierPayoutError, validateManualPaymentForm, validateSupplierPayoutForm } from '../src/components/supplierPayoutMessages';

const NOW = new Date('2026-10-25T15:00:00.000Z');
const owner: SupplierPayoutActor = { by: 'owner@example.com', role: 'owner', authMethod: 'firebase', kind: 'human' };
const agent: SupplierPayoutActor = { by: 'finance_analyst', role: 'owner', authMethod: 'firebase', kind: 'agent' };
const admin: SupplierPayoutActor = { by: 'admin@example.com', role: 'admin', authMethod: 'firebase', kind: 'human' };
const operatorKey: SupplierPayoutActor = { by: 'operator', role: 'owner', authMethod: 'operator_key', kind: 'human' };

const paid = { id: 'bk_paid', status: 'paid', paymentStatus: 'completed', paymentVerifiedAt: '2026-10-24T10:00:00.000Z', totalUSD: 250 };
const pending = { id: 'bk_pend', status: 'pending', paymentStatus: 'pending', totalUSD: 120 };
const unverified = { id: 'bk_unv', status: 'paid', paymentStatus: 'completed', totalUSD: 120 };
const refunded = { id: 'bk_paid', status: 'refunded', paymentStatus: 'refunded', paymentVerifiedAt: '2026-10-24T10:00:00.000Z', totalUSD: 250 };
const input = { proveedor: 'Operador local A', montoCRC: 45000, concepto: 'Tour volcán 2 pax' };

function lead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return { id: 'lead_abcdefgh01', status: 'pagado', statusHistory: [], updatedAt: '2026-10-20T00:00:00.000Z', lastActivityAt: '2026-10-20T00:00:00.000Z', bookingId: 'bk_paid', ...overrides } as LeadRecord;
}

function created(): LeadRecord {
  const r = applyCreateSupplierPayout(lead(), paid, input, owner, 'sp_test000001', NOW);
  assert.ok(r.ok);
  return r.lead;
}

test('máquina de estados: solo pendiente→aprobado→pagado_manual; cancelado desde no terminales', () => {
  assert.deepEqual([...SUPPLIER_PAYOUT_STATES], ['pendiente_aprobacion', 'aprobado', 'pagado_manual', 'cancelado']);
  assert.equal(canTransitionSupplierPayout('pendiente_aprobacion', 'aprobado'), true);
  assert.equal(canTransitionSupplierPayout('aprobado', 'pagado_manual'), true);
  assert.equal(canTransitionSupplierPayout('pendiente_aprobacion', 'pagado_manual'), false, 'no se paga sin aprobar');
  assert.equal(canTransitionSupplierPayout('pendiente_aprobacion', 'cancelado'), true);
  assert.equal(canTransitionSupplierPayout('aprobado', 'cancelado'), true);
  for (const to of SUPPLIER_PAYOUT_STATES) {
    assert.equal(canTransitionSupplierPayout('pagado_manual', to), false);
    assert.equal(canTransitionSupplierPayout('cancelado', to), false);
  }
});

test('crear: exige pago del cliente verificado por el servidor', () => {
  for (const booking of [pending, unverified, refunded, null]) {
    const r = applyCreateSupplierPayout(lead(), booking, input, owner, 'sp_test000001', NOW);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(['customer_payment_not_verified', 'booking_not_found'].includes(r.error));
  }
  const noBooking = applyCreateSupplierPayout(lead({ bookingId: undefined }), paid, input, owner, 'sp_test000001', NOW);
  assert.equal(!noBooking.ok && noBooking.error, 'lead_without_booking');
  const ok = created();
  const p = ok.supplierPayouts![0];
  assert.equal(p.estado, 'pendiente_aprobacion');
  assert.equal(p.bookingId, 'bk_paid');
  assert.equal(p.ejecutadoPorSistema, false);
  assert.deepEqual(p.audit, [{ action: 'crear', from: null, to: 'pendiente_aprobacion', at: NOW.toISOString(), by: owner.by }]);
});

test('ruta completa: aprobar y registrar pago manual con referencia y fecha, auditado', () => {
  const a = applyApproveSupplierPayout(created(), paid, 'sp_test000001', owner, NOW);
  assert.ok(a.ok);
  const parsed = parseMarkPaidInput({ metodo: 'sinpe', referencia: 'SP-2026102512', fechaPago: '2026-10-25' }, NOW);
  assert.ok(parsed.ok);
  const m = applyMarkSupplierPayoutPaid(a.lead, 'sp_test000001', parsed.input, owner, NOW);
  assert.ok(m.ok);
  const p = m.lead.supplierPayouts![0];
  assert.equal(p.estado, 'pagado_manual');
  assert.equal(p.referencia, 'SP-2026102512');
  assert.equal(p.fechaPago, '2026-10-25');
  assert.equal(p.approvedBy, owner.by);
  assert.equal(p.paidRecordedBy, owner.by);
  assert.deepEqual(p.audit.map(e => `${e.from}->${e.to}@${e.by}`), [`null->pendiente_aprobacion@${owner.by}`, `pendiente_aprobacion->aprobado@${owner.by}`, `aprobado->pagado_manual@${owner.by}`]);
  // Terminal: no se puede volver a pagar ni cancelar.
  const again = applyMarkSupplierPayoutPaid(m.lead, 'sp_test000001', parsed.input, owner, NOW);
  assert.equal(!again.ok && again.error, 'invalid_transition');
  const cancel = applyCancelSupplierPayout(m.lead, 'sp_test000001', 'error', owner, NOW);
  assert.equal(!cancel.ok && cancel.error, 'invalid_transition');
});

test('no se registra pago sin aprobar', () => {
  const parsed = parseMarkPaidInput({ metodo: 'transferencia', referencia: 'TRX1234', fechaPago: '2026-10-24' }, NOW);
  assert.ok(parsed.ok);
  const r = applyMarkSupplierPayoutPaid(created(), 'sp_test000001', parsed.input, owner, NOW);
  assert.equal(!r.ok && r.error, 'invalid_transition');
});

test('permisos: ningún agente IA ni admin/clave de operador aprueba o registra pagos', () => {
  const parsed = parseMarkPaidInput({ metodo: 'sinpe', referencia: 'REF12345', fechaPago: '2026-10-25' }, NOW);
  assert.ok(parsed.ok);
  const base = created();
  const approved = applyApproveSupplierPayout(base, paid, 'sp_test000001', owner, NOW);
  assert.ok(approved.ok);
  for (const actor of [agent, admin, operatorKey]) {
    const a = applyApproveSupplierPayout(base, paid, 'sp_test000001', actor, NOW);
    assert.equal(a.ok, false);
    if (!a.ok) assert.equal(a.error, actor.kind === 'agent' ? 'agent_not_allowed' : 'forbidden');
    const m = applyMarkSupplierPayoutPaid(approved.lead, 'sp_test000001', parsed.input, actor, NOW);
    assert.equal(m.ok, false);
    const c = applyCancelSupplierPayout(base, 'sp_test000001', 'motivo válido', actor, NOW);
    assert.equal(c.ok, false);
  }
  // Un agente solo puede proponer (queda pendiente, marcado como agente).
  const proposed = applyCreateSupplierPayout(lead(), paid, input, agent, 'sp_agent00001', NOW);
  assert.ok(proposed.ok);
  assert.equal(proposed.lead.supplierPayouts![0].estado, 'pendiente_aprobacion');
  assert.equal(proposed.lead.supplierPayouts![0].createdBy, 'agente:finance_analyst');
  // Admin no-dueño no crea.
  assert.equal(applyCreateSupplierPayout(lead(), paid, input, admin, 'sp_x0000001', NOW).ok, false);
});

test('aprobar: se bloquea si el pago del cliente dejó de estar verificado (reembolso)', () => {
  const r = applyApproveSupplierPayout(created(), refunded, 'sp_test000001', owner, NOW);
  assert.equal(!r.ok && r.error, 'customer_payment_not_verified');
});

test('cancelar exige motivo y queda en historial', () => {
  assert.equal(applyCancelSupplierPayout(created(), 'sp_test000001', ' ', owner, NOW).ok, false);
  const r = applyCancelSupplierPayout(created(), 'sp_test000001', 'Proveedor sin cupo', owner, NOW);
  assert.ok(r.ok);
  const p = r.lead.supplierPayouts![0];
  assert.equal(p.estado, 'cancelado');
  assert.equal(p.motivoCancelacion, 'Proveedor sin cupo');
  assert.equal(p.audit.at(-1)!.to, 'cancelado');
});

test('entradas: sin destinos de pago, montos y fechas válidos, referencia no duplicada', () => {
  assert.equal(parseCreateInput({ ...input, sinpe: '88888888' }).ok, false, 'nunca acepta un número SINPE');
  assert.equal(parseCreateInput({ ...input, telefono: '88888888' }).ok, false);
  assert.equal(parseCreateInput({ ...input, montoCRC: 0 }).ok, false);
  assert.equal(parseCreateInput({ ...input, montoCRC: 60_000_000 }).ok, false);
  assert.equal(parseCreateInput({ ...input, proveedor: '' }).ok, false);
  assert.equal(parseCreateInput({ ...input, montoCRC: '45000.50' }).ok, true);
  assert.equal(parseMarkPaidInput({ metodo: 'paypal', referencia: 'REF12345', fechaPago: '2026-10-25' }, NOW).ok, false);
  assert.equal(parseMarkPaidInput({ metodo: 'sinpe', referencia: 'x', fechaPago: '2026-10-25' }, NOW).ok, false);
  assert.equal(parseMarkPaidInput({ metodo: 'sinpe', referencia: 'REF12345', fechaPago: '2026-10-26' }, NOW).ok, false, 'fecha futura');
  assert.equal(parseMarkPaidInput({ metodo: 'sinpe', referencia: 'REF12345', fechaPago: '2026-02-30' }, NOW).ok, false);
  // Referencia ya usada en otro pago del lead.
  const parsed = parseMarkPaidInput({ metodo: 'sinpe', referencia: 'REF12345', fechaPago: '2026-10-25' }, NOW);
  assert.ok(parsed.ok);
  let l = created();
  const second = applyCreateSupplierPayout(l, paid, { ...input, concepto: 'Transporte' }, owner, 'sp_test000002', NOW);
  assert.ok(second.ok); l = second.lead;
  for (const id of ['sp_test000001', 'sp_test000002']) { const a = applyApproveSupplierPayout(l, paid, id, owner, NOW); assert.ok(a.ok); l = a.lead; }
  const first = applyMarkSupplierPayoutPaid(l, 'sp_test000001', parsed.input, owner, NOW);
  assert.ok(first.ok);
  const dup = applyMarkSupplierPayoutPaid(first.lead, 'sp_test000002', { ...parsed.input, referencia: 'ref12345' }, owner, NOW);
  assert.equal(!dup.ok && dup.error, 'duplicate_reference');
});

function store(initial: LeadRecord | null, bookings: Record<string, any> = { bk_paid: paid }) {
  let current = initial;
  let writes = 0;
  const d: SupplierPayoutDeps = {
    getLead: async (id) => (current && current.id === id ? current : null),
    getBooking: async (id) => bookings[id] || null,
    mutateLead: async (id, mutate) => {
      if (!current || current.id !== id) return { ok: false, error: 'not_found', message: 'Lead no encontrado.' };
      const r = mutate(current);
      if (r.ok && r.changed) { current = r.lead; writes += 1; }
      return r;
    },
    newId: () => `sp_svc${String(writes + 1).padStart(6, '0')}`,
    now: () => NOW,
  };
  return { d, get: () => current, writes: () => writes };
}

test('servicio: flujo HTTP-lógico completo, idempotencia y códigos', async () => {
  const s = store(lead());
  const c = await createSupplierPayout('lead_abcdefgh01', { ...input, clientRequestId: 'req_abcdefgh' }, owner, s.d);
  assert.equal(c.status, 201);
  const again = await createSupplierPayout('lead_abcdefgh01', { ...input, clientRequestId: 'req_abcdefgh' }, owner, s.d);
  assert.equal(again.status, 200);
  assert.equal(again.body.changed, false);
  assert.equal(s.writes(), 1);
  const id = (c.body.payout as any).id;
  assert.equal((await approveSupplierPayout('lead_abcdefgh01', id, agent, s.d)).status, 403);
  assert.equal((await approveSupplierPayout('lead_abcdefgh01', id, owner, s.d)).status, 200);
  assert.equal((await markSupplierPayoutPaid('lead_abcdefgh01', id, { metodo: 'sinpe', referencia: 'REF99999', fechaPago: '2026-10-25' }, agent, s.d)).status, 403);
  const m = await markSupplierPayoutPaid('lead_abcdefgh01', id, { metodo: 'sinpe', referencia: 'REF99999', fechaPago: '2026-10-25' }, owner, s.d);
  assert.equal(m.status, 200);
  assert.equal((m.body.payout as any).estado, 'pagado_manual');
  assert.equal(m.body.ejecutadoPorSistema, false);
  assert.equal((await cancelSupplierPayout('lead_abcdefgh01', id, { reason: 'tarde' }, owner, s.d)).status, 409);
  const list = await listSupplierPayouts('lead_abcdefgh01', s.d);
  assert.equal(list.body.pagoClienteVerificado, true);
  assert.equal((list.body.payouts as any[]).length, 1);
  assert.equal((await approveSupplierPayout('lead_abcdefgh01', '../x', owner, s.d)).status, 400);
  assert.equal((await listSupplierPayouts('../x', s.d)).status, 400);
});

test('servicio: reserva sin pago verificado → 409 sin escribir', async () => {
  const s = store(lead({ bookingId: 'bk_pend' }), { bk_pend: pending });
  const r = await createSupplierPayout('lead_abcdefgh01', input, owner, s.d);
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'customer_payment_not_verified');
  assert.equal(s.writes(), 0);
  assert.equal((await listSupplierPayouts('lead_abcdefgh01', s.d)).body.pagoClienteVerificado, false);
});

test('cableado: rutas requireOwner, actor humano fijado por el servidor; el módulo no ejecuta pagos', () => {
  const routes = fs.readFileSync('backend/routes/leads.ts', 'utf8');
  for (const p of ["'/api/admin/leads/:id/supplier-payouts'", "'/api/admin/leads/:id/supplier-payouts/:payoutId/approve'", "'/api/admin/leads/:id/supplier-payouts/:payoutId/mark-paid'", "'/api/admin/leads/:id/supplier-payouts/:payoutId/cancel'"]) {
    assert.match(routes, new RegExp(`\\.(get|post)\\(${p.replace(/[/:]/g, m => `\\${m}`)},\\s*requireOwner,`), p);
  }
  assert.doesNotMatch(routes, /kind:\s*req\.body/);
  const lib = fs.readFileSync('backend/leadSupplierPayouts.ts', 'utf8');
  const code = lib.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /from '\.\/(paymentWebhook|paymentWebhookService|stripeModeGuard|providerPayoutService|bookingService)'|new Stripe\(|paypal|fetch\(|updateBookingStatus|\.set\(|\.update\(/i);
  assert.doesNotMatch(code, /from 'stripe'|axios|https?:\/\//);
});

for (const [method, path] of [['GET', ''], ['POST', ''], ['POST', '/sp_test000001/approve'], ['POST', '/sp_test000001/mark-paid']] as const) {
  test(`HTTP ${method} supplier-payouts${path}: sin sesión de owner se rechaza`, async () => {
    const { createApp } = await import('../backend/app');
    const server = createApp().listen(0);
    try {
      const { port } = server.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${port}/api/admin/leads/lead_abcdefgh01/supplier-payouts${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify({ ...input, metodo: 'sinpe', referencia: 'REF12345', fechaPago: '2026-10-25' }) } : {}),
      });
      assert.ok([401, 403, 503].includes(res.status), `status inesperado ${res.status}`);
      const body = await res.json();
      assert.equal(body.payouts, undefined);
    } finally {
      server.close();
    }
  });
}

test('UI: panel montado junto a LeadPaymentPanel, sin marcar pagos ni pedir números SINPE de clientes', () => {
  const page = fs.readFileSync('src/pages/LeadsPipelinePage.tsx', 'utf8');
  assert.match(page, /<LeadPaymentPanel[^\n]*\/>\s*\n\s*<SupplierPayoutsPanel /);
  const panel = fs.readFileSync('src/components/SupplierPayoutsPanel.tsx', 'utf8');
  for (const p of ["'/approve'", "'/mark-paid'", "'/cancel'"].map(x => x.replace(/'/g, ''))) assert.ok(panel.includes(p), p);
  assert.doesNotMatch(panel, /paymentStatus\s*[:=]|numeroSinpe|sinpe\s*:\s*form|telefono/i);
  assert.match(panel, /no realiza pagos ni transferencias SINPE/);
  assert.match(panel, /does not make payments or SINPE transfers/);
});

test('UI: mensajes honestos y validaciones espejo del backend', () => {
  for (const code of ['customer_payment_not_verified', 'lead_without_booking', 'invalid_transition', 'agent_not_allowed']) {
    const es = describeSupplierPayoutError(409, { error: code }, true);
    const en = describeSupplierPayoutError(409, { error: code }, false);
    assert.ok(es && en);
    assert.doesNotMatch(es, /\b(pagad[oa]|transferid[oa])\b/i);
    assert.doesNotMatch(en, /\b(paid|transferred)\b/i);
  }
  assert.match(describeSupplierPayoutError(503, {}, true), /No se registró/);
  assert.equal(validateSupplierPayoutForm({ proveedor: 'Op', montoCRC: '45000', concepto: 'Tour' }, true), null);
  assert.ok(validateSupplierPayoutForm({ proveedor: 'Op', montoCRC: '-1', concepto: 'Tour' }, true));
  assert.equal(validateManualPaymentForm({ referencia: 'REF12345', fechaPago: '2026-10-25' }, true), null);
  assert.ok(validateManualPaymentForm({ referencia: 'x', fechaPago: '' }, false));
});

test('términos ES/EN: la plataforma cobra solo sus servicios y no paga SINPE a terceros por el cliente', () => {
  const payments = LEGAL_PAGES.terms.sections.find(s => s.heading.es === '4. Pagos')!;
  assert.match(payments.paragraphs.es.join(' '), /cobra únicamente sus propios servicios/);
  assert.match(payments.paragraphs.es.join(' '), /no realiza transferencias ni pagos SINPE a terceros por cuenta del cliente/);
  assert.match(payments.paragraphs.en.join(' '), /charges only for its own services/);
  assert.match(payments.paragraphs.en.join(' '), /does not make transfers or SINPE payments to third parties on the customer's behalf/);
});
