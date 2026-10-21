/**
 * Recordatorios de confirmación a proveedores (reemplaza el workflow n8n
 * "Seguimiento a Proveedores (IA)"). Cada 6 h busca órdenes de servicio que
 * siguen en `dispatched` después de su SLA y le recuerda al proveedor que
 * confirme. Máximo 3 recordatorios por orden; al agotarse, escala al equipo.
 *
 * Reglas: idempotente (claim transaccional por orden y ventana), nunca cambia
 * el estado de la reserva, nunca expone datos del proveedor al cliente.
 */
import { getFirestoreDb } from './bookingService';
import { sendEmail } from './notificationService';
import { createAlert } from './alertService';
import { resolveOperationalProvider, resolveConfiguredProviderEmail, needsReassignmentNoticeRetry, retryReassignmentNotification } from './providerCommunicationService';

export const REMINDER_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const MAX_PROVIDER_REMINDERS = 3;

export interface ReminderCandidate {
  id: string;
  status?: string;
  slaDeadline?: string;
  reminderCount?: number;
  lastReminderAt?: string | null;
  reminderEscalatedAt?: string | null;
}

export type ReminderDecision = 'remind' | 'escalate' | 'skip';

/** Decisión pura y testeable para una orden. */
export function decideReminder(order: ReminderCandidate, nowMs: number, opts = { intervalMs: REMINDER_INTERVAL_MS, max: MAX_PROVIDER_REMINDERS }): ReminderDecision {
  if (String(order.status || '') !== 'dispatched') return 'skip';
  const sla = Date.parse(String(order.slaDeadline || ''));
  if (!Number.isFinite(sla) || sla > nowMs) return 'skip';
  const count = Number(order.reminderCount || 0);
  const last = order.lastReminderAt ? Date.parse(order.lastReminderAt) : NaN;
  if (Number.isFinite(last) && nowMs - last < opts.intervalMs) return 'skip';
  if (count >= opts.max) return order.reminderEscalatedAt ? 'skip' : 'escalate';
  return 'remind';
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function buildReminderEmail(order: any, attempt: number) {
  const subject = `Recordatorio ${attempt}/${MAX_PROVIDER_REMINDERS}: confirme la orden ${order.id} - ${order.tourName || 'servicio'} (${order.date || ''})`;
  const portal = order.providerPortalUrl
    ? `<p><a href="${escapeHtml(order.providerPortalUrl)}" style="display:inline-block;background:#059669;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Confirmar o responder la orden</a></p>`
    : '<p>Responda a este correo con CONFIRMADO o con su disponibilidad.</p>';
  const html = `<div style="font-family:sans-serif;max-width:560px">
<h3>Recordatorio de confirmación</h3>
<p>Aún no hemos recibido su confirmación para esta orden de servicio:</p>
<ul><li><b>Orden:</b> ${escapeHtml(order.id)}</li><li><b>Servicio:</b> ${escapeHtml(order.tourName)}</li><li><b>Fecha:</b> ${escapeHtml(order.date)} ${escapeHtml(order.time)}</li><li><b>Pasajeros:</b> ${escapeHtml(order.adults ?? 0)} adultos, ${escapeHtml(order.children ?? 0)} niños</li></ul>
${portal}
<p style="color:#64748b;font-size:12px">Costa Rica Tours · mensaje automático</p></div>`;
  return { subject, html };
}

export async function executeProviderConfirmationReminders(nowMs = Date.now()) {
  const result = { checked: 0, reminded: 0, escalated: 0, missingEmail: 0, errors: 0, reassignmentNoticesRetried: 0, reassignmentNoticesFailed: 0, timestamp: new Date(nowMs).toISOString() };
  const db = getFirestoreDb();
  if (!db) return result;
  // #348: reintento acotado del aviso a proveedores reasignados cuyo correo falló.
  const reassigned = await db.collection('service_orders').where('status', '==', 'reassigned').limit(100).get().catch(() => ({ docs: [] as any[] }));
  for (const doc of reassigned.docs) {
    const order = { id: doc.id, ...(doc.data() as any) };
    if (!needsReassignmentNoticeRetry(order)) continue;
    try {
      const { retried, outcome } = await retryReassignmentNotification(order);
      if (!retried) continue;
      if (outcome?.success) result.reassignmentNoticesRetried += 1; else result.reassignmentNoticesFailed += 1;
    } catch {
      result.reassignmentNoticesFailed += 1;
    }
  }
  const snap = await db.collection('service_orders').where('status', '==', 'dispatched').limit(200).get();
  for (const doc of snap.docs) {
    result.checked += 1;
    const order = { id: doc.id, ...(doc.data() as any) };
    const decision = decideReminder(order, nowMs);
    if (decision === 'skip') continue;
    // Claim transaccional: evita duplicados entre instancias/reintentos.
    const claimed = await db.runTransaction(async tx => {
      const fresh = await tx.get(doc.ref);
      const data = { id: doc.id, ...(fresh.data() as any) };
      if (decideReminder(data, nowMs) !== decision) return null;
      if (decision === 'escalate') {
        tx.update(doc.ref, { reminderEscalatedAt: new Date(nowMs).toISOString() });
      } else {
        tx.update(doc.ref, { reminderCount: Number(data.reminderCount || 0) + 1, lastReminderAt: new Date(nowMs).toISOString() });
      }
      return data;
    }).catch(() => null);
    if (!claimed) continue;
    try {
      if (decision === 'escalate') {
        await createAlert({
          source: 'Seguimiento a Proveedores',
          severity: 'critical',
          title: `Proveedor sin confirmar tras ${MAX_PROVIDER_REMINDERS} recordatorios - ${claimed.id}`,
          message: `La orden ${claimed.id} (${claimed.tourName || ''}, ${claimed.date || ''}) sigue sin confirmación. Contactar al proveedor o reasignar manualmente.`,
          bookingId: claimed.bookingId,
          providerId: claimed.providerId
        });
        result.escalated += 1;
        continue;
      }
      const provider = claimed.providerId ? await resolveOperationalProvider(String(claimed.providerId), String(claimed.tourId || '')) : null;
      const to = provider ? resolveConfiguredProviderEmail(provider) : '';
      if (!to) {
        result.missingEmail += 1;
        await createAlert({
          source: 'Seguimiento a Proveedores',
          severity: 'warning',
          title: `Recordatorio no enviado: proveedor sin email - ${claimed.id}`,
          message: `La orden ${claimed.id} está pendiente de confirmación y el proveedor no tiene email operativo configurado.`,
          bookingId: claimed.bookingId,
          providerId: claimed.providerId
        });
        continue;
      }
      const attempt = Number(claimed.reminderCount || 0) + 1;
      const { subject, html } = buildReminderEmail(claimed, attempt);
      const sent = await sendEmail({ to, subject, html });
      if (sent.success) result.reminded += 1; else result.errors += 1;
    } catch (err) {
      result.errors += 1;
      console.warn(`⚠️ Recordatorio a proveedor falló para ${claimed.id}:`, err);
    }
  }
  return result;
}
