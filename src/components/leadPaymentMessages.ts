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

type Bilingual = { es: string; en: string };

const MESSAGES: Record<string, Bilingual> = {
  lead_without_booking: { es: 'El lead no tiene una reserva enlazada. No se generó ningún cobro.', en: 'Lead has no linked booking. No charge was created.' },
  stripe_live_blocked: { es: 'Stripe está bloqueado en modo LIVE. Solo se permite TEST hasta el lanzamiento.', en: 'Stripe LIVE is blocked. Only TEST is allowed until launch.' },
  checkout_unavailable: { es: 'Stripe no devolvió un enlace de pago. Revisá la configuración TEST.', en: 'Stripe returned no payment link. Check the TEST setup.' },
  booking_not_found: { es: 'La reserva no existe. No se enlazó nada.', en: 'Booking not found. Nothing was linked.' },
  invalid_booking_id: { es: 'ID de reserva inválido (A-Z, 0-9, _ o -).', en: 'Invalid booking ID (A-Z, 0-9, _ or -).' },
  invalid_lead_id: { es: 'ID de lead inválido.', en: 'Invalid lead ID.' },
  not_found: { es: 'Lead no encontrado.', en: 'Lead not found.' },
};

/**
 * Motivos de `voucherEligibility` (backend/bookingVoucherService.ts) y del estado de pago
 * (backend/leadBookingLink.ts). Nunca se muestran crudos: siempre ES/EN según el idioma activo.
 */
const VOUCHER_REASONS: Record<string, Bilingual> = {
  estado_no_pagado: { es: 'la reserva aún no está pagada', en: 'the booking is not paid yet' },
  pago_no_verificado: { es: 'el pago no ha sido verificado por Stripe', en: 'the payment has not been verified by Stripe' },
  monto_invalido: { es: 'el monto de la reserva no es válido', en: 'the booking amount is invalid' },
  no_disponible: { es: 'el voucher no está disponible para esta reserva', en: 'the voucher is not available for this booking' },
};

const VOUCHER_REASON_FALLBACK: Bilingual = { es: 'motivo no reconocido; revisá la reserva', en: 'unrecognized reason; check the booking' };

/** Traduce el motivo de no elegibilidad del voucher; los códigos desconocidos usan un texto genérico. */
export function describeVoucherReason(reason: string | null | undefined, es: boolean): string {
  if (!reason) return '';
  const known = VOUCHER_REASONS[String(reason)] || VOUCHER_REASON_FALLBACK;
  return es ? known.es : known.en;
}

/**
 * Motivos reales de `checkout_unavailable` (POST /api/admin/leads/:id/payment-link).
 * El backend reenvía en `body.message` el error de createStripeCheckoutForBooking/checkoutQuote,
 * en español. Se distinguen rechazos de política de la reserva (no hubo llamada a Stripe)
 * de fallas de Stripe o de configuración. `body.reason` tiene prioridad si el backend lo envía.
 */
type CheckoutKind = 'policy' | 'stripe';
const CHECKOUT_REASONS: Record<string, { kind: CheckoutKind; match: RegExp; text: Bilingual }> = {
  provider_not_confirmed: {
    kind: 'policy',
    match: /confirmaci[oó]n del proveedor/i,
    text: { es: 'Falta la confirmación del proveedor.', en: 'The provider has not confirmed the booking yet.' },
  },
  already_paid_or_missing: {
    kind: 'policy',
    match: /no existe o ya tiene un pago verificado/i,
    text: { es: 'La reserva no existe o ya tiene un pago verificado.', en: 'The booking does not exist or already has a verified payment.' },
  },
  booking_not_payable: {
    kind: 'policy',
    match: /no est[aá] disponible para cobrar/i,
    text: { es: 'La reserva no es elegible para cobro (estado, cupo liberado o pago no pendiente).', en: 'The booking is not eligible for payment (status, released availability or payment not pending).' },
  },
  invalid_amount: {
    kind: 'policy',
    match: /importe de reserva inv[aá]lido/i,
    text: { es: 'El importe de la reserva no es válido.', en: 'The booking amount is invalid.' },
  },
  invalid_service_date: {
    kind: 'policy',
    match: /fecha v[aá]lida/i,
    text: { es: 'La fecha del servicio no es válida o ya pasó.', en: 'The service date is invalid or already past.' },
  },
  stripe_not_configured: {
    kind: 'stripe',
    match: /stripe no est[aá] configurado/i,
    text: { es: 'Stripe no está configurado en el servidor (TEST).', en: 'Stripe is not configured on the server (TEST).' },
  },
  checkout_origin_missing: {
    kind: 'stripe',
    match: /APP_URL/,
    text: { es: 'Falta configurar APP_URL (origen HTTPS) para el retorno del pago.', en: 'APP_URL (HTTPS origin) is not configured for the payment return.' },
  },
};

const CHECKOUT_PREFIX: Record<CheckoutKind, Bilingual> = {
  policy: { es: 'Reserva no elegible para cobro', en: 'Booking not eligible for payment' },
  stripe: { es: 'Stripe no generó el enlace de pago', en: 'Stripe did not create the payment link' },
};

/** Clasifica el motivo de checkout_unavailable: política de la reserva vs. falla de Stripe. */
export function classifyCheckoutUnavailable(httpStatus: number, body: any): { kind: CheckoutKind; reason: string | null; serverMessage: string } {
  const serverMessage = typeof body?.message === 'string' ? body.message.trim().slice(0, 300) : '';
  const explicit = typeof body?.reason === 'string' ? CHECKOUT_REASONS[body.reason] : undefined;
  if (explicit) return { kind: explicit.kind, reason: body.reason, serverMessage };
  for (const [reason, def] of Object.entries(CHECKOUT_REASONS)) {
    if (serverMessage && def.match.test(serverMessage)) return { kind: def.kind, reason, serverMessage };
  }
  // 409 = rechazo de la reserva antes de llamar a Stripe; 5xx/otros = Stripe o servidor.
  return { kind: httpStatus === 409 ? 'policy' : 'stripe', reason: null, serverMessage };
}

function describeCheckoutUnavailable(httpStatus: number, body: any, es: boolean): string {
  const { kind, reason, serverMessage } = classifyCheckoutUnavailable(httpStatus, body);
  const prefix = es ? CHECKOUT_PREFIX[kind].es : CHECKOUT_PREFIX[kind].en;
  const noCharge = es ? 'No se generó ningún cobro.' : 'No charge was created.';
  if (reason) {
    const t = CHECKOUT_REASONS[reason].text;
    return `${prefix}: ${es ? t.es : t.en} ${noCharge}`;
  }
  if (serverMessage) {
    // Motivo no catalogado: se muestra tal cual lo envió el servidor (en español), rotulado.
    return es ? `${prefix}: ${serverMessage} ${noCharge}` : `${prefix}. ${noCharge} (server: ${serverMessage})`;
  }
  const generic = MESSAGES.checkout_unavailable;
  return es ? generic.es : generic.en;
}

/** Traduce la respuesta de error del backend a un mensaje honesto; nunca afirma que se cobró. */
export function describeLeadPaymentError(httpStatus: number, body: any, es: boolean): string {
  const code = typeof body?.error === 'string' ? body.error : '';
  if (code === 'checkout_unavailable') return describeCheckoutUnavailable(httpStatus, body, es);
  const known = MESSAGES[code];
  if (known) return es ? known.es : known.en;
  if (httpStatus === 401 || httpStatus === 403) return es ? 'Solo el dueño puede gestionar pagos.' : 'Only the owner can manage payments.';
  if (httpStatus === 503 || httpStatus === 502) return es ? 'Servicio de pagos no disponible ahora. No se generó ningún cobro.' : 'Payments service unavailable. No charge was created.';
  const msg = typeof body?.message === 'string' && body.message ? body.message : '';
  return msg || (es ? `Error ${httpStatus || ''}`.trim() : `Error ${httpStatus || ''}`.trim());
}
