/**
 * Aceptar / rechazar órdenes desde el portal de proveedores v2 (#320).
 *
 * - Tenant: la orden se carga con providerTenantScope (otra = 404).
 * - Idempotente por decisión (orden + proveedor): un cerrojo determinista en
 *   `idempotency_keys` (create = exclusivo). Repetir la misma acción devuelve
 *   el resultado guardado sin re-ejecutar; una acción distinta → 409.
 * - Aceptar reutiliza la lógica de dominio existente (handleProviderAction →
 *   acceptProviderOrder: transacción; confirma la reserva solo con pago verificado).
 * - Rechazar exige motivo de lista; dispara la reasignación existente y una
 *   alerta al dueño. El viajero no recibe nada ni sabe quién rechazó.
 * - Auditoría en el ledger inmutable existente (`agent_audit_log`), sin PII.
 * - Respuesta solo con la proyección de providerPortalView.ts; tras una
 *   reasignación el proveedor original NO ve a quién se reasignó.
 */
import { idempotencyDocId } from './idempotencyService';
import type { ProviderContext } from './providerAuth';
import { buildProviderAuditRecord, PROVIDER_AUDIT_COLLECTION } from './providerAudit';
import { toProviderPortalOrder } from './providerPortalView';
import { loadTenantServiceOrderRaw, SERVICE_ORDERS_COLLECTION } from './providerTenantScope';

export const PROVIDER_REJECT_REASONS = ['sin_cupo', 'clima', 'mantenimiento', 'otro'] as const;
export type ProviderRejectReason = (typeof PROVIDER_REJECT_REASONS)[number];
export type ProviderDecision = 'accept' | 'reject';

const PENDING_STATUSES = new Set(['dispatched', 'reassigned']);
const LOCK_COLLECTION = 'idempotency_keys';

export interface ProviderOrderActionInput {
  orderId: string;
  action: ProviderDecision;
  reason?: unknown;
  notes?: unknown;
  assignedGuide?: unknown;
  assignedVehicle?: unknown;
}

export interface ProviderOrderActionDeps {
  handleProviderAction: (params: any) => Promise<{ success: boolean; order: any; message: string }>;
  createAlert: (alert: any) => Promise<unknown>;
  emitEvent: (event: { type: string; source: string; payload: Record<string, unknown> }) => Promise<unknown>;
  now?: () => string;
}

export type ProviderOrderActionResult =
  | { ok: true; status: 200; replayed: boolean; result: Record<string, unknown> }
  | { ok: false; status: number; error: string };

const clean = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export function isRejectReason(value: unknown): value is ProviderRejectReason {
  return typeof value === 'string' && (PROVIDER_REJECT_REASONS as readonly string[]).includes(value);
}

export function decisionLockKey(orderId: string, providerId: string): string {
  return `provider-decision:${providerId}:${orderId}`;
}

export function validateProviderOrderAction(input: ProviderOrderActionInput): string | null {
  if (input.action !== 'accept' && input.action !== 'reject') return 'Acción no válida.';
  if (input.action === 'reject') {
    if (!isRejectReason(input.reason)) return `Motivo obligatorio: ${PROVIDER_REJECT_REASONS.join(', ')}.`;
    if (input.reason === 'otro' && clean(input.notes, 1200).length < 5) return 'Con motivo "otro" describa el motivo en las notas.';
  }
  return null;
}

export async function executeProviderOrderAction(
  db: any,
  ctx: ProviderContext,
  input: ProviderOrderActionInput,
  deps: ProviderOrderActionDeps,
): Promise<ProviderOrderActionResult> {
  const invalid = validateProviderOrderAction(input);
  if (invalid) return { ok: false, status: 400, error: invalid };
  if (!db) return { ok: false, status: 503, error: 'Portal de proveedores no disponible sin Firestore.' };
  const now = deps.now || (() => new Date().toISOString());

  const lockRef = db.collection(LOCK_COLLECTION).doc(idempotencyDocId(decisionLockKey(input.orderId, ctx.providerId)));
  const existing = await lockRef.get();
  if (existing.exists) {
    const lock = existing.data() || {};
    if (lock.status === 'completed') {
      if (lock.action !== input.action) return { ok: false, status: 409, error: 'Esta orden ya fue respondida con otra decisión.' };
      return { ok: true, status: 200, replayed: true, result: lock.result || {} };
    }
    if (lock.status === 'in_progress') return { ok: false, status: 409, error: 'La respuesta a esta orden ya se está procesando.' };
  }

  const order = await loadTenantServiceOrderRaw(db, ctx, input.orderId);
  if (!order) return { ok: false, status: 404, error: 'Orden no encontrada.' };
  const before = { status: String(order.status || '') };
  const alreadyConfirmed = input.action === 'accept' && order.status === 'confirmed';
  if (!PENDING_STATUSES.has(String(order.status)) && !alreadyConfirmed) {
    return { ok: false, status: 409, error: 'Esta orden ya no está pendiente de respuesta.' };
  }

  // Cerrojo exclusivo: dos solicitudes simultáneas no ejecutan dos veces.
  const lockBase = { scope: 'provider_portal_decision', providerId: ctx.providerId, orderId: order.id, action: input.action, createdAt: now() };
  try {
    if (existing.exists) await lockRef.set({ ...lockBase, status: 'in_progress', retriedAt: now() });
    else await lockRef.create({ ...lockBase, status: 'in_progress' });
  } catch {
    return { ok: false, status: 409, error: 'La respuesta a esta orden ya se está procesando.' };
  }

  const notes = clean(input.notes, 1200);
  let result: Record<string, unknown>;
  let after: Record<string, unknown>;
  try {
    if (input.action === 'accept') {
      const outcome = await deps.handleProviderAction({
        orderId: order.id,
        expectedProviderId: ctx.providerId,
        action: 'confirm',
        notes: notes || undefined,
        assignedGuide: clean(input.assignedGuide, 180) || undefined,
        assignedVehicle: clean(input.assignedVehicle, 120) || undefined,
      });
      if (!outcome?.success) throw new Error('accept_failed');
      const accepted = toProviderPortalOrder({ ...order, ...(outcome.order || {}), id: order.id, providerId: ctx.providerId });
      result = { decision: 'accept', order: accepted };
      after = { status: String(accepted.status || 'confirmed') };
    } else {
      const reason = input.reason as ProviderRejectReason;
      let reassigned = false;
      try {
        const outcome = await deps.handleProviderAction({
          orderId: order.id,
          expectedProviderId: ctx.providerId,
          action: 'reject',
          notes: `[${reason}] ${notes}`.trim(),
        });
        reassigned = Boolean(outcome?.success && outcome.order && String(outcome.order.providerId) !== ctx.providerId);
      } catch {
        // Sin proveedor alternativo verificado: la reasignación ya alertó al
        // dueño (crítica). Se registra el rechazo abajo para que no quede colgada.
        reassigned = false;
      }
      if (!reassigned) {
        await db.collection(SERVICE_ORDERS_COLLECTION).doc(order.id).update({
          status: 'rejected', rejectedAt: now(), rejectionReason: reason, updatedAt: now(),
        });
      }
      // Proyección para el proveedor que rechazó: sin datos de la reasignación.
      result = { decision: 'reject', order: { id: order.id, status: 'rejected', reason }, requiresHumanReassignment: !reassigned };
      after = { status: reassigned ? 'reassigned' : 'rejected' };
      await deps.createAlert({
        source: 'Portal de proveedores',
        severity: reassigned ? 'warning' : 'critical',
        title: `Proveedor rechazó la orden ${order.id}`,
        message: reassigned
          ? `Motivo: ${reason}. La orden se reasignó automáticamente; revise la nueva asignación.`
          : `Motivo: ${reason}. No hubo reasignación automática: requiere intervención humana.`,
        bookingId: order.bookingId,
        providerId: ctx.providerId,
        metadata: { reason, orderId: order.id },
      }).catch(() => undefined);
    }
  } catch {
    await lockRef.set({ ...lockBase, status: 'failed', failedAt: now() }).catch(() => undefined);
    return { ok: false, status: 409, error: 'No se pudo registrar la respuesta; puede reintentar.' };
  }

  const audit = buildProviderAuditRecord({
    action: input.action === 'accept' ? 'provider.order.accepted' : 'provider.order.rejected',
    target: order.id,
    actor: { uid: ctx.uid, email: null, role: `provider.${ctx.providerRole}`, providerId: ctx.providerId },
    before,
    after,
    reason: input.action === 'reject' ? String(input.reason) : null,
    now: now(),
  });
  await db.collection(PROVIDER_AUDIT_COLLECTION).doc(audit.id).create(audit);
  // Firestore no acepta `undefined`: se guarda y devuelve la misma forma JSON.
  result = JSON.parse(JSON.stringify(result));
  await lockRef.set({ ...lockBase, status: 'completed', completedAt: now(), auditId: audit.id, result });
  await deps.emitEvent({
    type: input.action === 'accept' ? 'provider.order.accepted' : 'provider.order.rejected',
    source: 'provider_portal_v2',
    payload: { orderId: order.id, providerId: ctx.providerId, auditId: audit.id, ...(input.action === 'reject' ? { reason: input.reason } : {}) },
  }).catch(() => undefined);

  return { ok: true, status: 200, replayed: false, result };
}

export async function defaultProviderOrderActionDeps(): Promise<ProviderOrderActionDeps> {
  const [{ handleProviderAction }, { createAlert }, { emitOperationalEvent }] = await Promise.all([
    import('./providerCommunicationService'),
    import('./alertService'),
    import('./operationalEventBus'),
  ]);
  return { handleProviderAction, createAlert, emitEvent: emitOperationalEvent };
}
