/**
 * Legacy lead payment-link contract retained for callers during migration.
 * Stripe is excluded by Costa Rica Tours product policy; this endpoint must
 * never inspect credentials, call a provider, create a checkout, or mutate a booking.
 */
export interface LeadPaymentLinkDeps {
  getLead: (id: string) => Promise<{ id: string; bookingId?: string } | null>;
  createCheckout: (bookingId: string) => Promise<{ status: number; body: any }>;
}

export interface LeadPaymentLinkResult {
  status: number;
  body: Record<string, unknown>;
}

export async function createLeadPaymentLink(_leadId: string, _deps: LeadPaymentLinkDeps): Promise<LeadPaymentLinkResult> {
  return {
    status: 410,
    body: {
      success: false,
      error: 'stripe_disabled_by_product_policy',
      message: 'Los enlaces de pago en línea no están disponibles. No se generó ningún cobro.'
    }
  };
}
