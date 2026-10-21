/**
 * Acceso a datos acotado por tenant para el portal de proveedores (#319).
 *
 * El backend (Admin SDK) ignora las reglas de Firestore, así que el
 * aislamiento se aplica aquí, en servidor, y se prueba con contratos:
 * - toda consulta filtra por `providerId == ctx.providerId` (del token);
 * - toda lectura por id comprueba el `providerId` del documento y responde
 *   "no encontrado" si es de otro proveedor (no revela que existe);
 * - `staff` solo ve órdenes asignadas a su uid;
 * - el resultado sale siempre por la proyección minimizada de
 *   providerPortalView.ts (sin email/teléfono del cliente).
 */

import type { ProviderContext } from './providerAuth';
import { toProviderPortalOrder } from './providerPortalView';

export const SERVICE_ORDERS_COLLECTION = 'service_orders';

export function belongsToTenant(doc: Record<string, any> | null | undefined, ctx: ProviderContext): boolean {
  if (!doc) return false;
  if (String(doc.providerId || '') !== ctx.providerId) return false;
  if (ctx.providerRole === 'staff') return String(doc.assignedStaffUid || '') === ctx.uid;
  return true;
}

/** Filtro defensivo en memoria (aplica aunque la consulta ya filtre). */
export function scopeToTenant<T extends Record<string, any>>(docs: T[], ctx: ProviderContext): T[] {
  return docs.filter((doc) => belongsToTenant(doc, ctx));
}

export async function listTenantServiceOrders(
  db: any,
  ctx: ProviderContext,
  options: { statuses?: string[]; limit?: number } = {},
) {
  if (!db) throw new Error('firestore_unavailable');
  const limit = Math.min(Math.max(Math.trunc(options.limit || 100), 1), 200);
  let query = db.collection(SERVICE_ORDERS_COLLECTION).where('providerId', '==', ctx.providerId);
  if (ctx.providerRole === 'staff') query = query.where('assignedStaffUid', '==', ctx.uid);
  if (options.statuses?.length) query = query.where('status', 'in', options.statuses.slice(0, 10));
  const snap = await query.limit(limit).get();
  const docs = (snap.docs || []).map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }));
  return scopeToTenant(docs, ctx).map(toProviderPortalOrder);
}

/** Orden cruda del tenant o null (inexistente o de otro proveedor). Uso interno. */
export async function loadTenantServiceOrderRaw(db: any, ctx: ProviderContext, orderId: string) {
  if (!db) throw new Error('firestore_unavailable');
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(String(orderId || ''))) return null;
  const snap = await db.collection(SERVICE_ORDERS_COLLECTION).doc(orderId).get();
  if (!snap.exists) return null;
  const order = { id: snap.id, ...(snap.data() || {}) };
  return belongsToTenant(order, ctx) ? order : null;
}

export async function loadTenantServiceOrder(db: any, ctx: ProviderContext, orderId: string) {
  const order = await loadTenantServiceOrderRaw(db, ctx, orderId);
  return order ? toProviderPortalOrder(order) : null;
}
