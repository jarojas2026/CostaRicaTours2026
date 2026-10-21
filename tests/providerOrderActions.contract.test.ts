/**
 * #320 — Aceptar/rechazar órdenes en el portal v2: tenant, permisos,
 * idempotencia, auditoría en agent_audit_log y sin PII.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { ProviderContext } from '../backend/providerAuth';
import { executeProviderOrderAction, type ProviderOrderActionDeps } from '../backend/providerOrderActions';
import { createFakeFirestore } from './helpers/fakeFirestore';

const A: ProviderContext = { uid: 'uid_a_mgr', providerId: 'prov_a', providerRole: 'manager' };
const B: ProviderContext = { uid: 'uid_b_mgr', providerId: 'prov_b', providerRole: 'manager' };

const seed = () => createFakeFirestore({
  service_orders: {
    so_a1: { providerId: 'prov_a', providerName: 'Operador A', bookingId: 'bk_a1', status: 'dispatched', tourId: 't1', tourName: 'Tour 1', customer: { name: 'Ana Prueba', email: 'ana@example.invalid', phone: '+000 1111' } },
    so_a2: { providerId: 'prov_a', providerName: 'Operador A', bookingId: 'bk_a2', status: 'dispatched', tourId: 't1', tourName: 'Tour 1', customer: { name: 'Beto Prueba', email: 'beto@example.invalid', phone: '+000 2222' } },
    so_b1: { providerId: 'prov_b', providerName: 'Operador B', bookingId: 'bk_b1', status: 'dispatched', tourId: 't2', tourName: 'Tour 2', customer: { name: 'Carla Prueba' } },
  },
});

function fakeDeps(db: any, opts: { reassignTo?: string; rejectThrows?: boolean } = {}) {
  const calls: any[] = [];
  const alerts: any[] = [];
  const events: any[] = [];
  const deps: ProviderOrderActionDeps = {
    handleProviderAction: async (params) => {
      calls.push(params);
      const ref = db.collection('service_orders').doc(params.orderId);
      const current = (await ref.get()).data();
      if (params.action === 'confirm') {
        await ref.update({ status: 'confirmed', confirmedAt: 'now' });
        return { success: true, order: { ...current, id: params.orderId, status: 'confirmed' }, message: 'ok' };
      }
      if (opts.rejectThrows) throw new Error('No hay proveedor alternativo verificado');
      await ref.update({ status: 'reassigned', providerId: opts.reassignTo, providerName: 'Operador Secreto' });
      return { success: true, order: { ...current, id: params.orderId, status: 'reassigned', providerId: opts.reassignTo, providerName: 'Operador Secreto' }, message: 'Sistema auto-reasignó la reserva a Operador Secreto.' };
    },
    createAlert: async (alert) => { alerts.push(alert); return {}; },
    emitEvent: async (event) => { events.push(event); return {}; },
    now: () => '2026-10-20T12:00:00.000Z',
  };
  return { deps, calls, alerts, events };
}

test('aceptar: solo el proveedor dueño; B sobre la orden de A → 404 sin efectos', async () => {
  const { db, data } = seed();
  const { deps, calls } = fakeDeps(db);
  const denied = await executeProviderOrderAction(db, B, { orderId: 'so_a1', action: 'accept' }, deps);
  assert.deepEqual(denied, { ok: false, status: 404, error: 'Orden no encontrada.' });
  assert.equal(calls.length, 0);
  assert.equal(data.service_orders.so_a1.status, 'dispatched');
  assert.equal(Object.keys(data.agent_audit_log || {}).length, 0);
});

test('aceptar es idempotente: la repetición no re-ejecuta ni re-audita', async () => {
  const { db, data } = seed();
  const { deps, calls, events } = fakeDeps(db);
  const first = await executeProviderOrderAction(db, A, { orderId: 'so_a1', action: 'accept', assignedGuide: 'Guía 1' }, deps);
  assert.ok(first.ok && !first.replayed);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].expectedProviderId, 'prov_a', 'providerId del token, no del body');
  const second = await executeProviderOrderAction(db, A, { orderId: 'so_a1', action: 'accept' }, deps);
  assert.ok(second.ok && second.replayed);
  assert.deepEqual(second.ok && second.result, first.ok && first.result);
  assert.equal(calls.length, 1);
  assert.equal(events.length, 1);
  const audits = Object.values(data.agent_audit_log || {}) as any[];
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action, 'provider.order.accepted');
  assert.deepEqual(audits[0].before, { status: 'dispatched' });
  assert.equal(audits[0].actor.providerId, 'prov_a');
  assert.equal(audits[0].immutable, true);
  const conflict = await executeProviderOrderAction(db, A, { orderId: 'so_a1', action: 'reject', reason: 'clima' }, deps);
  assert.equal(!conflict.ok && conflict.status, 409);
});

test('rechazar exige motivo de lista; "otro" exige notas', async () => {
  const { db } = seed();
  const { deps, calls } = fakeDeps(db, { reassignTo: 'prov_c' });
  for (const reason of [undefined, '', 'porque sí']) {
    const r = await executeProviderOrderAction(db, A, { orderId: 'so_a1', action: 'reject', reason }, deps);
    assert.equal(!r.ok && r.status, 400);
  }
  const otro = await executeProviderOrderAction(db, A, { orderId: 'so_a1', action: 'reject', reason: 'otro', notes: '' }, deps);
  assert.equal(!otro.ok && otro.status, 400);
  assert.equal(calls.length, 0);
});

test('rechazar: reasigna, alerta al dueño, audita y NO revela el nuevo proveedor', async () => {
  const { db, data } = seed();
  const { deps, alerts, events } = fakeDeps(db, { reassignTo: 'prov_c' });
  const r = await executeProviderOrderAction(db, A, { orderId: 'so_a2', action: 'reject', reason: 'sin_cupo' }, deps);
  assert.ok(r.ok);
  const body = JSON.stringify(r);
  assert.doesNotMatch(body, /prov_c|Operador Secreto|example\.invalid|\+000/);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].metadata.reason, 'sin_cupo');
  assert.equal(events[0].type, 'provider.order.rejected');
  const audit = (Object.values(data.agent_audit_log) as any[])[0];
  assert.equal(audit.action, 'provider.order.rejected');
  assert.equal(audit.reason, 'sin_cupo');
  assert.deepEqual(audit.after, { status: 'reassigned' });
  assert.doesNotMatch(JSON.stringify(audit), /Ana|Beto|example\.invalid|\+000/);
  // Repetir el rechazo (la orden ya es de prov_c) devuelve el mismo resultado, no 404.
  const again = await executeProviderOrderAction(db, A, { orderId: 'so_a2', action: 'reject', reason: 'sin_cupo' }, deps);
  assert.ok(again.ok && again.replayed);
  assert.equal(alerts.length, 1);
});

test('rechazar sin proveedor alternativo deja la orden en rejected y alerta crítica', async () => {
  const { db, data } = seed();
  const { deps, alerts } = fakeDeps(db, { rejectThrows: true });
  const r = await executeProviderOrderAction(db, A, { orderId: 'so_a1', action: 'reject', reason: 'mantenimiento' }, deps);
  assert.ok(r.ok && (r.result as any).requiresHumanReassignment === true);
  assert.equal(data.service_orders.so_a1.status, 'rejected');
  assert.equal(data.service_orders.so_a1.rejectionReason, 'mantenimiento');
  assert.equal(alerts[0].severity, 'critical');
});

test('aceptar: la respuesta usa la proyección mínima (sin email/teléfono)', async () => {
  const { db } = seed();
  const { deps } = fakeDeps(db);
  const r: any = await executeProviderOrderAction(db, A, { orderId: 'so_a1', action: 'accept' }, deps);
  assert.equal(r.result.order.customer.displayName, 'Ana P.');
  assert.doesNotMatch(JSON.stringify(r), /example\.invalid|\+000/);
});

test('orden ya cerrada → 409; fallo del dominio libera el cerrojo para reintentar', async () => {
  const { db, data } = seed();
  data.service_orders.so_a1.status = 'completed';
  const { deps } = fakeDeps(db);
  const closed = await executeProviderOrderAction(db, A, { orderId: 'so_a1', action: 'accept' }, deps);
  assert.equal(!closed.ok && closed.status, 409);
  let fail = true;
  const flaky: ProviderOrderActionDeps = { ...deps, handleProviderAction: async (p) => { if (fail) throw new Error('storage'); return deps.handleProviderAction(p); } };
  const first = await executeProviderOrderAction(db, A, { orderId: 'so_a2', action: 'accept' }, flaky);
  assert.equal(!first.ok && first.status, 409);
  fail = false;
  const retry = await executeProviderOrderAction(db, A, { orderId: 'so_a2', action: 'accept' }, flaky);
  assert.ok(retry.ok && !retry.replayed);
});

test('rutas: lectura staff+, decisiones manager+, sin providerId del body', () => {
  const routes = fs.readFileSync(path.join(process.cwd(), 'backend/routes/provider.ts'), 'utf8');
  assert.match(routes, /'\/api\/provider\/v2\/orders', requireProvider\('staff'\)/);
  assert.match(routes, /'\/api\/provider\/v2\/orders\/:orderId', requireProvider\('staff'\)/);
  assert.match(routes, /`\/api\/provider\/v2\/orders\/:orderId\/\$\{decision\}`, requireProvider\('manager'\)/);
  assert.doesNotMatch(routes, /req\.(body|query)\??\.providerId/);
});
