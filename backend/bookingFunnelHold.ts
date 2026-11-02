/**
 * Embudo de reserva (#484) — etapa de apartado y confirmación (hold_booking / confirm_booking, #485).
 *
 * Flujo en el chat del cliente:
 *   cotización (create_quote) → el cliente pide reservar → hold_booking (sin cobro, 60 min)
 *   → resumen + pedido de confirmación explícita → el cliente confirma con sus palabras
 *   ("Sí, confirmo" / "Yes, I confirm") → confirm_booking → reserva PENDIENTE DE PAGO
 *   ('pendiente_pago'). Independiente del proveedor de pago: el chat no crea enlaces ni cobra; la
 *   agencia envía las instrucciones/enlace de pago y el dueño verifica manualmente.
 *
 * Reglas que valida el SERVIDOR (no el modelo):
 *  - hold_booking usa SIEMPRE la cotización guardada en el estado de la conversación (misma sesión);
 *    el número que mande el modelo se ignora salvo para rechazar uno distinto.
 *  - Solo se aparta una cotización que ya existía ANTES de este turno y con la misma combinación
 *    tour/fecha/personas (el cliente la vio).
 *  - confirm_booking exige: (a) un apartado que ya existía ANTES de este turno (el cliente vio el
 *    resumen) y (b) confirmación explícita en el MENSAJE LITERAL del cliente de este turno
 *    (isExplicitConfirmation). El servicio vuelve a validar sesión y vencimiento.
 *  - La reserva queda PENDIENTE DE PAGO y de verificación del dueño; nunca se dice confirmada ni pagada.
 *  - El contacto de WhatsApp va como acción rápida `direct_whatsapp` (la barrera de contactos
 *    quita teléfonos y enlaces del texto de la respuesta).
 *  - Respuestas en lista blanca: nunca proveedor, costo, comisión ni margen.
 */
import { COMPANY_FACTS } from './agentSkillPack';
import { findCatalogTour } from './agentProductTools';
import { redactProviderIdentityForCustomer } from './customerOutboundPrivacy';
import { buildAgentBookingWhatsAppText } from '../shared/agentBookingWhatsApp';
import type { ConversationLanguage, ConversationState } from './conversationState';

export interface FunnelHold {
  holdNumber: string;
  quoteNumber: string;
  totalPrice: number;
  currency: string;
  expiresAt: string;
}

export interface FunnelBooking {
  bookingNumber: string;
  holdNumber: string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  currency: string;
}

export interface HoldStageDeps {
  holdBooking?: (input: Record<string, unknown>, ctx: Record<string, unknown>) => Promise<any>;
  confirmBooking?: (input: Record<string, unknown>, ctx: Record<string, unknown>) => Promise<any>;
}

export const HOLD_STAGE_TOOL_NAMES = ['hold_booking', 'confirm_booking'] as const;

const HOLD_NUMBER = /^HLD-\d{8}-[A-F0-9]{4}$/;
const BOOKING_NUMBER = /^AGB-\d{8}-[A-F0-9]{4}$/;
const QUOTE_NUMBER = /^QTE-\d{8}-[A-F0-9]{4}$/;

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const RESERVE_REQUEST = /\b(reserv\w*|apart\w*|book\w*|lo quiero|la quiero|lo tomo|la tomo|lo tomamos|hold (it|the quote)|go ahead)\b/;
const RESERVE_NEGATION = /\b(no|not|don'?t|do not|todavia no|aun no|ya no|sin)\b[^.!?]{0,25}\b(reserv|apart|book|quiero|tomo)/;

/** El cliente pide reservar/apartar la cotización vigente (es/en). */
export function detectReserveRequest(message: string): boolean {
  const t = norm(message);
  return RESERVE_REQUEST.test(t) && !RESERVE_NEGATION.test(t);
}

/** Confirmación explícita (misma regla que confirmBooking). Sin import estático del servicio. */
export async function isExplicitCustomerConfirmation(message: string): Promise<boolean> {
  const { isExplicitConfirmation } = await import('./agentBookingHold');
  return isExplicitConfirmation(message);
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

const num2 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(2)) : NaN);

export function readHold(raw: any): FunnelHold | undefined {
  if (!raw || typeof raw !== 'object' || !HOLD_NUMBER.test(String(raw.holdNumber || ''))) return undefined;
  return {
    holdNumber: String(raw.holdNumber),
    quoteNumber: String(raw.quoteNumber || ''),
    totalPrice: num2(raw.totalPrice),
    currency: String(raw.currency || 'USD'),
    expiresAt: String(raw.expiresAt || ''),
  };
}

export function readBooking(raw: any): FunnelBooking | undefined {
  if (!raw || typeof raw !== 'object' || !BOOKING_NUMBER.test(String(raw.bookingNumber || ''))) return undefined;
  return {
    bookingNumber: String(raw.bookingNumber),
    holdNumber: String(raw.holdNumber || ''),
    status: String(raw.status || 'pendiente_pago'),
    paymentStatus: String(raw.paymentStatus || 'awaiting_payment_instructions'),
    totalPrice: num2(raw.totalPrice),
    currency: String(raw.currency || 'USD'),
  };
}

const funnelRaw = (state: ConversationState): Record<string, any> => {
  const f: any = state.extra?.funnel;
  return f && typeof f === 'object' ? f : {};
};

export function getHoldStage(state: ConversationState): { hold?: FunnelHold; booking?: FunnelBooking; quoteNumber?: string } {
  const f = funnelRaw(state);
  const quoteNumber = f.quote && typeof f.quote.quoteNumber === 'string' ? String(f.quote.quoteNumber) : undefined;
  return { hold: readHold(f.hold), booking: readBooking(f.booking), ...(quoteNumber ? { quoteNumber } : {}) };
}

function setHoldStage(state: ConversationState, patch: { hold?: FunnelHold | null; booking?: FunnelBooking | null }): ConversationState {
  const f = { ...funnelRaw(state) };
  if (patch.hold === null) delete f.hold; else if (patch.hold) f.hold = patch.hold;
  if (patch.booking === null) delete f.booking; else if (patch.booking) f.booking = patch.booking;
  return { ...state, extra: { ...(state.extra || {}), funnel: JSON.parse(JSON.stringify(f)) } };
}

/** Hay un apartado esperando confirmación (el embudo debe atender el próximo mensaje). */
export function hasPendingHold(state: ConversationState): boolean {
  const { hold, booking } = getHoldStage(state);
  return Boolean(hold && !booking);
}

/** Si la cotización cambió (otra fecha/personas/tour), el apartado y la reserva anteriores ya no aplican al embudo. */
export function syncHoldWithQuote(state: ConversationState): ConversationState {
  const { hold, booking, quoteNumber } = getHoldStage(state);
  if (hold && hold.quoteNumber !== quoteNumber) return setHoldStage(state, { hold: null, booking: null });
  if (!hold && booking) return setHoldStage(state, { booking: null });
  return state;
}

// ---------------------------------------------------------------------------
// Pasos validados
// ---------------------------------------------------------------------------

async function realHold(input: Record<string, unknown>, ctx: Record<string, unknown>) {
  const { holdBooking } = await import('./agentBookingHold');
  return holdBooking(input as any, ctx as any);
}
async function realConfirm(input: Record<string, unknown>, ctx: Record<string, unknown>) {
  const { confirmBooking } = await import('./agentBookingHold');
  return confirmBooking(input as any, ctx as any);
}

export interface HoldStepContext { sessionId?: string; language: ConversationLanguage }

/** hold_booking validado: usa la cotización del estado. */
export async function runHoldStep(state: ConversationState, ctx: HoldStepContext, args: Record<string, unknown> = {}, deps: HoldStageDeps = {}) {
  const { quoteNumber, hold, booking } = getHoldStage(state);
  if (!quoteNumber || !QUOTE_NUMBER.test(quoteNumber)) return { state, result: { success: false, error: 'quote_required', next: 'create_quote' } };
  const asked = String(args.quoteNumber ?? '').trim().toUpperCase();
  if (asked && asked !== quoteNumber) return { state, result: { success: false, error: 'quote_mismatch' } };
  if (booking) return { state, result: { success: true, alreadyBooked: true, bookingNumber: booking.bookingNumber, status: booking.status } };
  let raw: any;
  try { raw = await (deps.holdBooking ?? realHold)({ quoteNumber }, { sessionId: ctx.sessionId, channel: 'chat', language: ctx.language }); } catch { raw = { success: false, error: 'hold_failed' }; }
  if (raw?.success === true && HOLD_NUMBER.test(String(raw.holdNumber || ''))) {
    const next: FunnelHold = {
      holdNumber: String(raw.holdNumber),
      quoteNumber,
      totalPrice: num2(raw.totalPrice),
      currency: String(raw.currency || 'USD'),
      expiresAt: String(raw.expiresAt || ''),
    };
    const reused = Boolean(hold && hold.holdNumber === next.holdNumber);
    return { state: setHoldStage(state, { hold: next }), result: { success: true, held: true, charged: false, holdNumber: next.holdNumber, totalPrice: next.totalPrice, currency: next.currency, expiresAt: next.expiresAt, ...(reused ? { reused: true } : {}) } };
  }
  return { state, result: { success: false, error: String(raw?.error || 'hold_failed').slice(0, 60), ...(raw?.next ? { next: String(raw.next).slice(0, 30) } : {}) } };
}

/**
 * confirm_booking validado. `heldBeforeTurn` es el apartado que existía antes de este mensaje:
 * sin él (o si es otro) no se confirma, aunque el texto diga "confirmo".
 */
export async function runConfirmStep(
  state: ConversationState,
  ctx: HoldStepContext & { userMessage: string; heldBeforeTurn?: FunnelHold },
  args: Record<string, unknown> = {},
  deps: HoldStageDeps = {},
) {
  const { hold, booking } = getHoldStage(state);
  if (booking) return { state, result: { success: true, reused: true, bookingNumber: booking.bookingNumber, status: booking.status, paymentStatus: booking.paymentStatus } };
  if (!hold) return { state, result: { success: false, error: 'hold_required', next: 'hold_booking' } };
  const asked = String(args.holdNumber ?? '').trim().toUpperCase();
  if (asked && asked !== hold.holdNumber) return { state, result: { success: false, error: 'hold_mismatch' } };
  if (!ctx.heldBeforeTurn || ctx.heldBeforeTurn.holdNumber !== hold.holdNumber) {
    return { state, result: { success: false, error: 'summary_not_shown', message: 'Show the summary and ask the customer to confirm explicitly first.' } };
  }
  if (!(await isExplicitCustomerConfirmation(ctx.userMessage))) {
    return { state, result: { success: false, error: 'explicit_confirmation_required', message: 'Ask the customer to reply "Sí, confirmo" / "Yes, I confirm".' } };
  }
  let raw: any;
  try {
    raw = await (deps.confirmBooking ?? realConfirm)({ holdNumber: hold.holdNumber }, { sessionId: ctx.sessionId, userMessage: ctx.userMessage, channel: 'chat', language: ctx.language });
  } catch { raw = { success: false, error: 'confirm_failed' }; }
  if (raw?.success === true && BOOKING_NUMBER.test(String(raw.bookingNumber || ''))) {
    const next: FunnelBooking = {
      bookingNumber: String(raw.bookingNumber),
      holdNumber: hold.holdNumber,
      status: String(raw.status || 'pendiente_pago'),
      paymentStatus: String(raw.paymentStatus || 'awaiting_payment_instructions'),
      totalPrice: num2(raw.totalPrice),
      currency: String(raw.currency || 'USD'),
    };
    return {
      state: setHoldStage(state, { booking: next }),
      result: { success: true, created: true, bookingNumber: next.bookingNumber, status: next.status, paymentStatus: next.paymentStatus, charged: false, paymentInstructions: 'agency_will_send_shortly', totalPrice: next.totalPrice, currency: next.currency },
    };
  }
  const error = String(raw?.error || 'confirm_failed').slice(0, 60);
  // Apartado vencido o inactivo: se quita del embudo para poder apartar de nuevo.
  const cleared = error === 'hold_expired' || error === 'hold_not_active' || error === 'hold_not_found' ? setHoldStage(state, { hold: null }) : state;
  return { state: cleared, result: { success: false, error, ...(raw?.next ? { next: String(raw.next).slice(0, 30) } : {}) } };
}

/**
 * Paso determinista del servidor en este turno (antes del modelo):
 *  - apartado previo + confirmación explícita literal ⇒ confirm_booking;
 *  - cotización previa sin cambios + pedido de reservar ⇒ hold_booking.
 */
export async function runHoldStage(params: {
  state: ConversationState;
  message: string;
  quoteReused: boolean;
  heldBeforeTurn?: FunnelHold;
  ctx: HoldStepContext;
  now?: Date;
}, deps: HoldStageDeps = {}): Promise<{ state: ConversationState; step: 'hold_booking' | 'confirm_booking' | null; result: any }> {
  const state = syncHoldWithQuote(params.state);
  const { hold, booking, quoteNumber } = getHoldStage(state);
  if (booking) return { state, step: null, result: null };
  if (hold && params.heldBeforeTurn?.holdNumber === hold.holdNumber && await isExplicitCustomerConfirmation(params.message)) {
    const r = await runConfirmStep(state, { ...params.ctx, userMessage: params.message, heldBeforeTurn: params.heldBeforeTurn }, {}, deps);
    return { state: r.state, step: 'confirm_booking', result: r.result };
  }
  if (quoteNumber && params.quoteReused && (!hold || Date.parse(hold.expiresAt) <= (params.now ?? new Date()).getTime()) && detectReserveRequest(params.message)) {
    const r = await runHoldStep(state, params.ctx, {}, deps);
    return { state: r.state, step: 'hold_booking', result: r.result };
  }
  return { state, step: null, result: null };
}

// ---------------------------------------------------------------------------
// Prompt, respuestas deterministas y acciones rápidas
// ---------------------------------------------------------------------------

export const HOLD_STAGE_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'hold_booking',
      description: 'Hold the customer\'s current quote for up to 60 minutes at the quoted price, WITHOUT charging, when the customer asks to book/reserve it. Uses the saved quote; does not confirm operator availability.',
      parameters: { type: 'object', properties: { quoteNumber: { type: 'string', description: 'QTE-YYYYMMDD-XXXX (optional; the saved quote is used)' } } },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'confirm_booking',
      description: 'ONLY when the customer\'s latest message explicitly confirms the hold summary in their own words ("Sí, confirmo" / "Yes, I confirm"). Creates a booking PENDING PAYMENT; the agency then sends payment instructions. No payment link, no charge. Never call it on a question, a maybe or your own initiative; the server rejects it without explicit confirmation.',
      parameters: { type: 'object', properties: { holdNumber: { type: 'string', description: 'HLD-YYYYMMDD-XXXX (optional; the saved hold is used)' } } },
    },
  },
];

/** Instrucciones para el modelo según la etapa (va en el prompt de sistema del embudo). */
export function holdStagePrompt(state: ConversationState): string {
  const { hold, booking, quoteNumber } = getHoldStage(state);
  if (booking) {
    return `Booking ${booking.bookingNumber} was created and is PENDING PAYMENT: the agency will send payment instructions/link shortly, and our team verifies availability with the local operator. A WhatsApp button is shown below your message. Nothing was charged. Never say the booking is confirmed or paid, never write any link or phone number, and do not call confirm_booking again.`;
  }
  if (hold) {
    return `Quote ${hold.quoteNumber} is HELD as ${hold.holdNumber} until ${hold.expiresAt} (no charge). Show the summary (tour, date, travelers, total ${hold.currency} ${hold.totalPrice}) and ask the customer to reply "Sí, confirmo" / "Yes, I confirm" to create the booking (pending payment; the agency then sends payment instructions). Call confirm_booking ONLY if the customer's latest message explicitly confirms. Never say the booking is confirmed or paid.`;
  }
  if (quoteNumber) {
    return 'If the customer wants to book this quote, call hold_booking (no charge, held for 60 minutes). Never claim it is booked.';
  }
  return '';
}

export function holdStageGroundTexts(state: ConversationState): string[] {
  const { hold, booking } = getHoldStage(state);
  const out: string[] = [];
  if (hold && Number.isFinite(hold.totalPrice)) out.push(`USD ${hold.totalPrice}`);
  if (booking && Number.isFinite(booking.totalPrice)) out.push(`USD ${booking.totalPrice}`);
  return out;
}

const fmtExpiry = (iso: string, lang: ConversationLanguage) => {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const cr = new Date(ms - 6 * 60 * 60 * 1000);
  const hh = String(cr.getUTCHours()).padStart(2, '0');
  const mm = String(cr.getUTCMinutes()).padStart(2, '0');
  return lang === 'en' ? ` (until ${hh}:${mm} Costa Rica time)` : ` (hasta las ${hh}:${mm}, hora de Costa Rica)`;
};

/** Respuesta determinista de la etapa (sin modelo o si el modelo falla). null = no aplica. */
export function holdStageReply(state: ConversationState, lang: ConversationLanguage, step: string | null, result: any): string | null {
  const en = lang === 'en';
  const { hold, booking } = getHoldStage(state);
  if (booking && (step === 'confirm_booking' || !step)) {
    return en
      ? `Your booking ${booking.bookingNumber} is registered as PENDING PAYMENT. Our agency will send you the payment instructions/link shortly, and our team verifies availability with the local operator. Nothing has been charged. You can also reach us on WhatsApp with the button below.`
      : `Tu reserva ${booking.bookingNumber} quedó registrada como PENDIENTE DE PAGO. Nuestra agencia te enviará en breve las instrucciones/enlace de pago, y nuestro equipo verifica la disponibilidad con el operador local. No se ha cobrado nada. También puedes escribirnos por WhatsApp con el botón de abajo.`;
  }
  if (step === 'confirm_booking' && result && result.success === false) {
    if (result.error === 'hold_expired' || result.error === 'hold_not_active' || result.error === 'hold_not_found') {
      return en
        ? 'The 60-minute hold expired, so nothing was booked or charged. Would you like me to hold the quote again?'
        : 'El apartado de 60 minutos venció, así que no se reservó ni se cobró nada. ¿Quieres que vuelva a apartar la cotización?';
    }
    return en
      ? 'I could not create the booking right now. Nothing was charged. You can tap "Talk to our team" and we will help you.'
      : 'No pude crear la reserva en este momento. No se cobró nada. Puedes tocar "Hablar con el equipo" y te ayudamos.';
  }
  if (hold) {
    return en
      ? `I held quote ${hold.quoteNumber} as ${hold.holdNumber} for up to 60 minutes${fmtExpiry(hold.expiresAt, lang)}: total ${hold.currency} ${hold.totalPrice}. Nothing has been charged. To create the booking (pending our team's verification with the local operator) and receive the payment instructions from our agency, reply "Yes, I confirm".`
      : `Aparté la cotización ${hold.quoteNumber} como ${hold.holdNumber} por hasta 60 minutos${fmtExpiry(hold.expiresAt, lang)}: total ${hold.currency} ${hold.totalPrice}. No se ha cobrado nada. Para crear la reserva (pendiente de que nuestro equipo verifique con el operador local) y recibir de nuestra agencia las instrucciones de pago, responde "Sí, confirmo".`;
  }
  if (step === 'hold_booking' && result && result.success === false) {
    return result.error === 'quote_expired'
      ? (en ? 'That quote expired. Shall I prepare a new one?' : 'Esa cotización venció. ¿Preparo una nueva?')
      : (en ? 'I could not hold the quote right now. Nothing was charged.' : 'No pude apartar la cotización en este momento. No se cobró nada.');
  }
  return null;
}

/** Título público del tour (catálogo), sin identidad del operador. '' si no está. */
function safeCustomerTourTitle(tourId: string, lang: ConversationLanguage): string {
  if (!tourId) return '';
  let t: any;
  try { t = findCatalogTour(tourId); } catch { t = undefined; }
  if (!t) return '';
  const raw = String(t?.title?.[lang] || t?.title?.es || t?.title?.en || '');
  const providerNames = [t?.operatorName, t?.providerId, t?.operatorId].filter((n: unknown): n is string => typeof n === 'string' && n.length >= 3);
  return redactProviderIdentityForCustomer(raw, { language: lang, providerNames }).slice(0, 120);
}

/** Acciones rápidas de la etapa: botón de confirmación literal y contacto de WhatsApp de la agencia. */
export function holdStageQuickActions(state: ConversationState, lang: ConversationLanguage): Array<{ label: string; action: string; data?: any }> {
  const { hold, booking } = getHoldStage(state);
  if (booking) {
    // Texto prellenado con código AGB, tour, fecha y personas (shared/agentBookingWhatsApp.ts).
    const f = funnelRaw(state);
    const tourId = String(f.quote?.tourId || '');
    const date = String(f.quote?.date || '');
    const pax = Number(f.quote?.pax) || null;
    const tourTitle = safeCustomerTourTitle(tourId, lang);
    const whatsappText = buildAgentBookingWhatsAppText({ bookingNumber: booking.bookingNumber, tourTitle, date, pax, language: lang });
    return [{ label: `💬 WhatsApp ${COMPANY_FACTS.whatsappDisplay}`, action: 'direct_whatsapp', data: { bookingNumber: booking.bookingNumber, tourTitle, date, pax, ...(whatsappText ? { whatsappText } : {}) } }];
  }
  if (hold && !booking) {
    const msg = lang === 'en' ? 'Yes, I confirm' : 'Sí, confirmo';
    return [{ label: `✅ ${msg}`, action: 'send_message', data: { message: msg } }];
  }
  return [];
}
