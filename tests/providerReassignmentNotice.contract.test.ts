/**
 * #348 — La reasignación de proveedor debe reflejar el resultado REAL del correo
 * al proveedor alternativo: fallo registrado, nunca marcado como notificado y
 * reintento acotado (mismo patrón que #341/#325).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  needsReassignmentNoticeRetry,
  notifyReassignedProvider,
  retryReassignmentNotification,
} from '../backend/providerCommunicationService';
import { MAX_EMAIL_DELIVERY_ATTEMPTS } from '../backend/emailDeliveryOutcome';

const provider: any = { id: 'prov_alt', name: 'Alt', email: 'ops@example.invalid', status: 'active', activeTours: ['t1'], slaTargetMinutes: 30 };
const baseOrder = (): any => ({
  id: 'ord_1', bookingId: 'bk_1', tourId: 't1', tourName: 'Tour', providerId: 'prov_alt', providerName: 'Alt',
  date: '2026-11-02', time: '08:00', adults: 2, children: 0, pickupLocation: 'Hotel', customer: {},
  payoutAmountUSD: 0, payoutAmountCRC: 0, platformFeeUSD: 0, status: 'reassigned', dispatchedAt: '', slaDeadline: '', failoverAttempts: 1,
});
const noop = async () => undefined;

test('correo fallido: se registra el fallo, no se marca como notificado y se alerta', async () => {
  const order = baseOrder();
  const persisted: any[] = [];
  const alerts: any[] = [];
  const outcome = await notifyReassignedProvider(order, provider, {
    send: async () => ({ success: false, error: 'smtp_down', attempts: 2 }),
    persist: async (o) => { persisted.push({ ...o }); },
    alert: (async (a: any) => { alerts.push(a); }) as any,
  });
  assert.equal(outcome.success, false);
  assert.equal(order.reassignmentNoticeSent, false);
  assert.equal(order.deliveryStatus, 'failed');
  assert.equal(order.reassignmentNoticeDeliveryAttempts, 1);
  assert.equal(order.reassignmentNoticeDeliveryError, 'smtp_down');
  assert.equal(order.reassignmentNoticeDeliveryStatus, 'pending');
  assert.equal(persisted.length, 1);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].severity, 'warning');
  assert.equal(needsReassignmentNoticeRetry(order), true);
});

test('sin correo operativo configurado: fallo registrado, nunca notificado', async () => {
  const order = baseOrder();
  let sent = 0;
  const outcome = await notifyReassignedProvider(order, { ...provider, email: '' }, {
    send: async () => { sent++; return { success: true, attempts: 1 }; }, persist: noop, alert: noop as any,
  });
  assert.equal(sent, 0);
  assert.equal(outcome.success, false);
  assert.equal(outcome.error, 'provider_email_unconfigured');
  assert.equal(order.reassignmentNoticeSent, false);
});

test('correo aceptado por el transporte: notificado con recibo y sin reintento', async () => {
  const order = baseOrder();
  const outcome = await notifyReassignedProvider(order, provider, {
    send: async () => ({ success: true, id: 'msg_1', attempts: 1 }), persist: noop, alert: noop as any,
  });
  assert.equal(outcome.success, true);
  assert.equal(order.reassignmentNoticeSent, true);
  assert.equal(order.deliveryStatus, 'transport_accepted');
  assert.equal(order.deliveryReceiptId, 'msg_1');
  assert.equal(needsReassignmentNoticeRetry(order), false);
});

test('reintento acotado: tras MAX intentos acumulados queda failed y no se reintenta más', async () => {
  const order = baseOrder();
  let sends = 0;
  const deps = {
    send: async () => { sends++; return { success: false, error: 'smtp_down', attempts: 2 }; },
    persist: noop, alert: noop as any, resolveProvider: async () => provider,
  };
  for (let i = 0; i < MAX_EMAIL_DELIVERY_ATTEMPTS + 3; i++) await retryReassignmentNotification(order, deps);
  assert.equal(sends, MAX_EMAIL_DELIVERY_ATTEMPTS);
  assert.equal(order.reassignmentNoticeDeliveryStatus, 'failed');
  assert.equal(order.reassignmentNoticeSent, false);
  assert.equal((await retryReassignmentNotification(order, deps)).retried, false);
});

test('el código de reasignación ya no ignora el resultado del envío', () => {
  const src = readFileSync('backend/providerCommunicationService.ts', 'utf8');
  const failover = src.slice(src.indexOf('async function triggerAutoFailoverReassignment'), src.indexOf('function buildReassignmentEmail'));
  assert.doesNotMatch(failover, /sendEmail\(/);
  assert.doesNotMatch(failover, /reasignada exitosamente/);
  assert.match(failover, /notifyReassignedProvider\(rejectedOrder, alternateProvider\)/);
  const reminders = readFileSync('backend/providerReminderService.ts', 'utf8');
  assert.match(reminders, /retryReassignmentNotification\(order\)/);
});
