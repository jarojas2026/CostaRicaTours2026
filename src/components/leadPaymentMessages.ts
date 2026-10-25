/** Mensajes y validaciones puras del panel de pago de leads (testeables sin DOM). */

export interface LeadPaymentStatusView {
  leadId: string;
  bookingId: string;
  paymentStatus: string | null;
  paymentVerifiedAt: string | null;
  montoVerificado: number | null;
  moneda?: string;
  voucherElegible: boolean;
  voucherMotivo: string | null;
}

const BOOKING_ID = /^[A-Za-z0-9_-]{1,80}$/;

export function isValidBookingIdInput(value: string): boolean {
  return BOOKING_ID.test(String(value || '').trim());
}

const MESSAGES: Record<string, { es: string; en: string }> = {
  lead_without_booking: { es: 'El lead no tiene una reserva enlazada. No se generó ningún cobro.', en: 'Lead has no linked booking. No charge was created.' },
  stripe_live_blocked: { es: 'Stripe está bloqueado en modo LIVE. Solo se permite TEST hasta el lanzamiento.', en: 'Stripe LIVE is blocked. Only TEST is allowed until launch.' },
  checkout_unavailable: { es: 'Stripe no devolvió un enlace de pago. Revisá la configuración TEST.', en: 'Stripe returned no payment link. Check the TEST setup.' },
  booking_not_found: { es: 'La reserva no existe. No se enlazó nada.', en: 'Booking not found. Nothing was linked.' },
  invalid_booking_id: { es: 'ID de reserva inválido (A-Z, 0-9, _ o -).', en: 'Invalid booking ID (A-Z, 0-9, _ or -).' },
  invalid_lead_id: { es: 'ID de lead inválido.', en: 'Invalid lead ID.' },
  not_found: { es: 'Lead no encontrado.', en: 'Lead not found.' },
};

/** Traduce la respuesta de error del backend a un mensaje honesto; nunca afirma que se cobró. */
export function describeLeadPaymentError(httpStatus: number, body: any, es: boolean): string {
  const code = typeof body?.error === 'string' ? body.error : '';
  const known = MESSAGES[code];
  if (known) return es ? known.es : known.en;
  if (httpStatus === 401 || httpStatus === 403) return es ? 'Solo el dueño puede gestionar pagos.' : 'Only the owner can manage payments.';
  if (httpStatus === 503 || httpStatus === 502) return es ? 'Servicio de pagos no disponible ahora. No se generó ningún cobro.' : 'Payments service unavailable. No charge was created.';
  const msg = typeof body?.message === 'string' && body.message ? body.message : '';
  return msg || (es ? `Error ${httpStatus || ''}`.trim() : `Error ${httpStatus || ''}`.trim());
}
