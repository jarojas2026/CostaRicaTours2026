/**
 * Conciliación de pagos Stripe (MODO TEST) de reservas creadas por confirm_booking (#485).
 *
 * confirm_booking crea la sesión de checkout con metadata
 *   { source: 'agent_confirm_booking', agentBookingNumber: 'AGB-…', holdNumber, quoteNumber }
 * y un documento en `agent_bookings` (status 'pending_supplier_verification').
 *
 * Esta función marca ese documento como PAGADO (paymentStatus 'paid', paymentMode 'test') cuando
 * el evento ya fue verificado (firma del webhook o sesión recuperada desde la API de Stripe):
 *  - Solo TEST: sesión con livemode=true o clave en vivo ⇒ se rechaza (stripe_test_only). No lee
 *    ni cambia ALLOW_STRIPE_LIVE; el bloqueo de claves en vivo sigue en stripeModeGuard.
 *  - Valida sesión de checkout, estado 'paid', moneda USD e importe exacto en centavos.
 *  - Idempotente: si ya está pagada, responde duplicate sin escribir (en transacción cuando hay).
 *  - NO confirma la reserva: el status sigue 'pending_supplier_verification', supplierVerified
 *    sigue false y ownerVerificationRequired=true. NO paga a proveedores (manual, solo el dueño).
 *  - Salida en lista blanca: nunca proveedor, costo, comisión ni margen.
 */
import { AGENT_BOOKING_COLLECTION } from './agentBookingHold';
import { checkStripeMode, type StripeModeCheck } from './stripeModeGuard';

export const AGENT_PAYMENT_SOURCE = 'agent_confirm_booking';
const BOOKING_NUMBER = /^AGB-\d{8}-[A-F0-9]{4}$/;

export interface AgentCheckoutSessionLike {
  id?: string | null;
  livemode?: boolean | null;
  payment_status?: string | null;
  currency?: string | null;
  amount_total?: number | null;
  payment_intent?: unknown;
  metadata?: Record<string, string> | null;
}

export interface AgentPaymentDeps {
  db?: any;
  now?: () => Date;
  stripeMode?: () => StripeModeCheck;
}

export type AgentPaymentResult =
  | { success: true; reconciled: true; duplicate: boolean; bookingNumber: string; status: string; paymentStatus: 'paid'; mode: 'test' }
  | { success: false; reconciled: false; error: string; bookingNumber?: string };

/** ¿La sesión de checkout viene de confirm_booking del asistente? */
export function isAgentBookingSession(session: AgentCheckoutSessionLike | null | undefined): boolean {
  const md = session?.metadata || {};
  return md.source === AGENT_PAYMENT_SOURCE && BOOKING_NUMBER.test(String(md.agentBookingNumber || ''));
}

async function resolveDb(deps: AgentPaymentDeps) {
  if (deps.db !== undefined) return deps.db;
  return (await import('./bookingService')).getFirestoreDb() as any;
}

const paymentIntentId = (pi: unknown) => (typeof pi === 'string' ? pi : (pi && typeof pi === 'object' && typeof (pi as any).id === 'string' ? (pi as any).id : null));

/** Marca como pagada (TEST) la reserva del asistente. Nunca lanza. */
export async function reconcileAgentBookingPayment(
  session: AgentCheckoutSessionLike,
  evidence: { eventId?: string; via: 'webhook' | 'return' },
  deps: AgentPaymentDeps = {},
): Promise<AgentPaymentResult> {
  const bookingNumber = String(session?.metadata?.agentBookingNumber || '');
  const fail = (error: string): AgentPaymentResult => ({ success: false, reconciled: false, error, ...(BOOKING_NUMBER.test(bookingNumber) ? { bookingNumber } : {}) });
  try {
    if (!isAgentBookingSession(session)) return fail('not_agent_booking');
    // Guardia TEST: ni sesiones en vivo ni clave en vivo (aunque ALLOW_STRIPE_LIVE=true).
    if (session.livemode === true) return fail('stripe_test_only');
    const mode = (deps.stripeMode ?? checkStripeMode)();
    if (mode.blocked) return fail('stripe_live_blocked');
    if (mode.mode === 'live') return fail('stripe_test_only');
    if (!session.id) return fail('session_id_missing');
    if (session.payment_status !== 'paid') return fail('payment_not_completed');
    if (String(session.currency || '').toLowerCase() !== 'usd') return fail('currency_mismatch');

    const db = await resolveDb(deps);
    if (!db) return fail('storage_unavailable');
    const now = (deps.now ?? (() => new Date()))();
    const col = db.collection(AGENT_BOOKING_COLLECTION);
    const snap = await col.where('bookingNumber', '==', bookingNumber).limit(1).get();
    const found = snap?.docs?.[0];
    if (!found) return fail('booking_not_found');
    const ref = found.ref ?? col.doc(found.id);

    const check = (data: Record<string, any> | undefined): AgentPaymentResult | 'update' => {
      if (!data) return fail('booking_not_found');
      if (String(data.checkoutSessionId || '') !== session.id) return fail('session_mismatch');
      if (data.stripeMode !== 'test') return fail('stripe_test_only');
      const expected = Math.round(Number(data.totalPrice || 0) * 100);
      if (!(expected > 0) || session.amount_total !== expected) return fail('amount_mismatch');
      if (data.paymentStatus === 'paid') {
        return { success: true, reconciled: true, duplicate: true, bookingNumber, status: String(data.status || 'pending_supplier_verification'), paymentStatus: 'paid', mode: 'test' };
      }
      return 'update';
    };

    const patch = {
      paymentStatus: 'paid',
      paymentMode: 'test',
      paidAt: now.toISOString(),
      paymentVerifiedAt: now.toISOString(),
      paymentEvidence: {
        provider: 'stripe',
        mode: 'test',
        via: evidence.via,
        webhookEventId: evidence.eventId ?? null,
        sessionId: session.id,
        paymentIntent: paymentIntentId(session.payment_intent),
      },
      // La reserva sigue pendiente: el dueño verifica al proveedor y paga a mano.
      ownerVerificationRequired: true,
      supplierVerified: false,
      supplierPayout: 'manual_owner_only',
    };

    const done = (data: Record<string, any>): AgentPaymentResult => ({ success: true, reconciled: true, duplicate: false, bookingNumber, status: String(data.status || 'pending_supplier_verification'), paymentStatus: 'paid', mode: 'test' });

    if (typeof db.runTransaction === 'function') {
      return await db.runTransaction(async (tx: any) => {
        const cur = await tx.get(ref);
        const data = cur?.data?.();
        const c = check(data);
        if (c !== 'update') return c;
        tx.update(ref, patch);
        return done(data!);
      });
    }
    const data = found.data?.();
    const c = check(data);
    if (c !== 'update') return c;
    await ref.update(patch);
    return done(data!);
  } catch {
    return fail('reconcile_failed');
  }
}
