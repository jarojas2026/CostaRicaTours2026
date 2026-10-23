/**
 * Enlace lead → reserva y estado de pago del lead (solo backend, owner).
 *
 * - POST /api/admin/leads/:id/link-booking  guarda lead.bookingId con una reserva EXISTENTE.
 *   No sobrescribe un bookingId distinto salvo force=true. Cada cambio queda en
 *   lead.bookingHistory (quién, cuándo, de qué reserva a cuál, si fue forzado).
 * - GET /api/admin/leads/:id/payment-status solo lectura: paymentStatus, paymentVerifiedAt,
 *   montoVerificado y elegibilidad del voucher con la MISMA regla que
 *   GET /api/bookings/:id/download-pdf (buildVoucherContent/voucherEligibility).
 *
 * No toca Stripe, paymentWebhook ni stripeModeGuard: nada aquí marca una reserva como pagada.
 */
import { buildVoucherContent, voucherEligibility } from './bookingVoucherService';
import type { LeadBookingLinkChange, LeadMutation, LeadRecord } from './leadPipeline';

const LEAD_ID = /^[A-Za-z0-9_-]{1,80}$/;
const BOOKING_ID = /^[A-Za-z0-9_-]{1,80}$/;

export interface ApiResult {
  status: number;
  body: Record<string, unknown>;
}

export type LinkError = 'booking_already_linked';

/** Regla pura de enlace: idempotente con la misma reserva; otra reserva exige force. */
export function applyBookingLink(
  lead: LeadRecord,
  bookingId: string,
  actor: { by: string },
  opts: { force?: boolean; note?: string } = {},
  now: Date = new Date(),
): LeadMutation<LinkError> {
  const current = String(lead.bookingId || '').trim() || null;
  if (current === bookingId) return { ok: true, lead, changed: false };
  if (current && !opts.force) {
    return { ok: false, error: 'booking_already_linked', message: `El lead ya está enlazado a la reserva ${current}. Usa force=true para reemplazarla.` };
  }
  const at = now.toISOString();
  const change: LeadBookingLinkChange = {
    from: current,
    to: bookingId,
    at,
    by: actor.by,
    forced: Boolean(current && opts.force),
    ...(opts.note ? { note: opts.note } : {}),
  };
  return {
    ok: true,
    changed: true,
    lead: { ...lead, bookingId, updatedAt: at, lastActivityAt: at, bookingHistory: [...(lead.bookingHistory || []), change] },
  };
}

export interface LinkBookingDeps {
  getBooking: (bookingId: string) => Promise<any | null>;
  mutateLead: (id: string, mutate: (lead: LeadRecord) => LeadMutation<LinkError>) => Promise<LeadMutation<LinkError | 'not_found'>>;
  now?: () => Date;
}

export async function linkLeadBooking(leadId: string, body: unknown, actor: { by: string }, deps: LinkBookingDeps): Promise<ApiResult> {
  const id = String(leadId || '').trim();
  if (!LEAD_ID.test(id)) return { status: 400, body: { success: false, error: 'invalid_lead_id' } };
  const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const bookingId = typeof input.bookingId === 'string' ? input.bookingId.trim() : '';
  if (!BOOKING_ID.test(bookingId)) return { status: 400, body: { success: false, error: 'invalid_booking_id', message: 'bookingId requerido (A-Z, 0-9, _ o -).' } };
  const force = input.force === true || input.force === 'true';
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 300) || undefined : undefined;

  const booking = await deps.getBooking(bookingId);
  if (!booking) return { status: 404, body: { success: false, error: 'booking_not_found', message: 'La reserva no existe. No se enlazó nada.' } };

  const now = (deps.now || (() => new Date()))();
  const result = await deps.mutateLead(id, lead => applyBookingLink(lead, bookingId, actor, { force, note }, now));
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 409;
    return { status, body: { success: false, error: result.error, message: result.message } };
  }
  return {
    status: 200,
    body: {
      success: true,
      leadId: result.lead.id,
      bookingId: result.lead.bookingId,
      changed: result.changed,
      bookingHistory: result.lead.bookingHistory || [],
    },
  };
}

export interface PaymentStatusDeps {
  getLead: (id: string) => Promise<{ id: string; bookingId?: string } | null>;
  getBooking: (bookingId: string) => Promise<any | null>;
}

/** Monto verificado solo si el servidor confirmó el pago (completed + paymentVerifiedAt). */
export function verifiedAmountUSD(booking: any): number | null {
  if (booking?.paymentStatus !== 'completed' || !booking?.paymentVerifiedAt) return null;
  const amount = Number(booking?.totalUSD);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

export async function getLeadPaymentStatus(leadId: string, deps: PaymentStatusDeps): Promise<ApiResult> {
  const id = String(leadId || '').trim();
  if (!LEAD_ID.test(id)) return { status: 400, body: { success: false, error: 'invalid_lead_id' } };
  const lead = await deps.getLead(id);
  if (!lead) return { status: 404, body: { success: false, error: 'not_found', message: 'Lead no encontrado.' } };
  const bookingId = String(lead.bookingId || '').trim();
  if (!bookingId) return { status: 409, body: { success: false, error: 'lead_without_booking', message: 'El lead no tiene una reserva enlazada.' } };
  const booking = await deps.getBooking(bookingId);
  if (!booking) return { status: 404, body: { success: false, error: 'booking_not_found', leadId: lead.id, bookingId } };

  // Misma regla que GET /api/bookings/:id/download-pdf.
  const eligible = buildVoucherContent(booking) !== null;
  const elig = voucherEligibility(booking);
  return {
    status: 200,
    body: {
      success: true,
      leadId: lead.id,
      bookingId,
      paymentStatus: booking.paymentStatus ?? null,
      paymentVerifiedAt: booking.paymentVerifiedAt ?? null,
      montoVerificado: verifiedAmountUSD(booking),
      moneda: 'USD',
      voucherElegible: eligible,
      voucherMotivo: eligible ? null : (elig.ok ? 'no_disponible' : elig.reason),
    },
  };
}
