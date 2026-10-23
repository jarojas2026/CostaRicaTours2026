/**
 * Enlace de pago desde un lead (solo backend, owner).
 *
 * POST /api/admin/leads/:id/payment-link reutiliza el checkout Stripe existente
 * (createStripeCheckoutForBooking en routes/payments.ts): no crea clientes Stripe propios,
 * no toca paymentWebhook y no marca nada como pagado. El pago solo se da por bueno cuando
 * el webhook firmado o el retorno verificado lo confirman.
 *
 * Reglas:
 * - El lead debe existir y estar enlazado a una reserva (lead.bookingId); sin reserva no hay cobro.
 * - Solo modo TEST: si la clave es sk_live_/rk_live_ y ALLOW_STRIPE_LIVE !== 'true' se rechaza
 *   antes de llamar a Stripe (503 stripe_live_blocked).
 */
import { checkStripeMode } from './stripeModeGuard';

export interface LeadPaymentLinkDeps {
  getLead: (id: string) => Promise<{ id: string; bookingId?: string } | null>;
  createCheckout: (bookingId: string) => Promise<{ status: number; body: any }>;
  stripeMode?: () => ReturnType<typeof checkStripeMode>;
}

export interface LeadPaymentLinkResult {
  status: number;
  body: Record<string, unknown>;
}

const LEAD_ID = /^[A-Za-z0-9_-]{1,80}$/;

export async function createLeadPaymentLink(leadId: string, deps: LeadPaymentLinkDeps): Promise<LeadPaymentLinkResult> {
  const id = String(leadId || '').trim();
  if (!LEAD_ID.test(id)) return { status: 400, body: { success: false, error: 'invalid_lead_id' } };

  const lead = await deps.getLead(id);
  if (!lead) return { status: 404, body: { success: false, error: 'not_found', message: 'Lead no encontrado.' } };

  const bookingId = String(lead.bookingId || '').trim();
  if (!bookingId) {
    return { status: 409, body: { success: false, error: 'lead_without_booking', message: 'El lead no tiene una reserva enlazada. No se generó ningún cobro.' } };
  }

  const mode = (deps.stripeMode || checkStripeMode)();
  if (mode.blocked) {
    return { status: 503, body: { success: false, error: 'stripe_live_blocked', message: 'Stripe está en modo TEST hasta el lanzamiento (ALLOW_STRIPE_LIVE). No se generó ningún cobro.' } };
  }

  const checkout = await deps.createCheckout(bookingId);
  if (checkout.status !== 200 || !checkout.body?.url) {
    return {
      status: checkout.status === 200 ? 502 : checkout.status,
      body: { success: false, error: 'checkout_unavailable', message: String(checkout.body?.error || 'Stripe no devolvió un enlace de pago.'), leadId: lead.id, bookingId },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      leadId: lead.id,
      bookingId,
      provider: 'stripe',
      mode: mode.mode,
      url: checkout.body.url,
      sessionId: checkout.body.id,
      paymentStatus: 'pending',
    },
  };
}
