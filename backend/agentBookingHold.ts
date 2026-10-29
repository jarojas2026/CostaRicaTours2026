/**
 * Fase C — herramientas hold_booking y confirm_booking del asistente IA.
 *
 * hold_booking: aparta una cotización vigente (QTE) por tiempo limitado SIN cobrar. Congela el
 *   precio cotizado para la misma sesión de chat; NO reserva cupo con el operador (eso lo verifica
 *   una persona). Crea un documento en `agent_booking_holds` y devuelve su número (HLD-…).
 *
 * confirm_booking: con confirmación explícita del cliente en su mensaje literal, convierte un
 *   apartado vigente en una reserva PENDIENTE (`agent_bookings`, status
 *   'pending_supplier_verification') y genera un enlace de pago Stripe en MODO TEST.
 *   - Respeta stripeModeGuard: clave en vivo sin ALLOW_STRIPE_LIVE ⇒ bloqueado. Además, esta
 *     herramienta de IA solo opera en TEST: con clave en vivo (aunque ALLOW_STRIPE_LIVE=true)
 *     responde stripe_test_only. Pasar a vivo exige un cambio de código revisado por el dueño.
 *   - La reserva queda pendiente hasta que el dueño verifica manualmente al proveedor. Nunca se
 *     marca como confirmada ni pagada aquí; nunca se paga a proveedores (pagos a proveedores son
 *     manuales y solo los aprueba el dueño, docs/REGLAS_PLATAFORMA.md).
 *
 * Seguridad y privacidad:
 *  - La cotización y el apartado solo los usa la MISMA sesión que los creó (sessionIdHash);
 *    otra sesión recibe "not_found" (no se revela su existencia).
 *  - Las respuestas usan lista blanca: nunca proveedor, costo, comisión ni margen.
 *  - Marcas de tiempo, vencimientos y números los pone el SERVIDOR. Nunca lanza.
 *  - Solo escribe en colecciones privadas de servidor (Admin SDK; reglas cliente en Default Deny).
 *    No envía correos ni mensajes, no borra nada y no modifica la cotización original.
 */
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { hashIdentifier } from './agentEventLog';
import { AGENT_QUOTE_COLLECTION } from './agentQuote';
import { checkStripeMode, type StripeModeCheck } from './stripeModeGuard';

export const AGENT_HOLD_COLLECTION = 'agent_booking_holds';
export const AGENT_BOOKING_COLLECTION = 'agent_bookings';
/** Duración del apartado (acotada al vencimiento de la cotización). */
export const HOLD_DURATION_MINUTES = 60;
/** Stripe exige que una sesión de checkout venza entre 30 min y 24 h. */
const CHECKOUT_MIN_MS = 31 * 60 * 1000;
const CHECKOUT_MAX_MS = 23 * 60 * 60 * 1000;
const CR_OFFSET_MS = 6 * 60 * 60 * 1000;

const QUOTE_NUMBER = /^QTE-\d{8}-[A-F0-9]{4}$/;
const HOLD_NUMBER = /^HLD-\d{8}-[A-F0-9]{4}$/;

/** Confirmación explícita en el mensaje literal del cliente (es/en). */
const EXPLICIT_CONFIRMATION = /\b(s[ií],?\s+confirmo|confirmo|lo confirmo|confirmamos|confirmar la reserva|acepto|i confirm|yes,?\s+(please\s+)?confirm|confirm (the |my )?booking|please confirm|go ahead and book)\b/i;
const NEGATION = /\b(no|not|don'?t|todav[ií]a no|a[uú]n no)\s+(lo\s+)?(confirm|acept)/i;

export function isExplicitConfirmation(message: unknown): boolean {
  const text = String(message ?? '');
  return EXPLICIT_CONFIRMATION.test(text) && !NEGATION.test(text);
}

export function buildNumber(prefix: 'HLD' | 'AGB', now: Date, randomHex: string): string {
  const ymd = new Date(now.getTime() - CR_OFFSET_MS).toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${ymd}-${randomHex.toUpperCase().slice(0, 4).padStart(4, '0')}`;
}

type DocSnap = { id: string; exists?: boolean; data: () => Record<string, any> | undefined };
type QuerySnap = { size?: number; empty?: boolean; docs: DocSnap[] };

export interface BookingHoldDeps {
  db?: {
    collection: (name: string) => {
      add: (doc: Record<string, unknown>) => Promise<{ id: string }>;
      where: (field: string, op: '==', value: unknown) => { limit: (n: number) => { get: () => Promise<QuerySnap> } };
    };
  } | null;
  now?: () => Date;
  randomHex?: () => string;
  stripeMode?: () => StripeModeCheck;
  /** Crea la sesión de checkout Stripe (TEST). Inyectable en tests: nunca se llama a Stripe en CI. */
  createCheckoutSession?: (params: CheckoutParams) => Promise<{ id: string; url: string | null }>;
}

export interface CheckoutParams {
  amountCents: number;
  currency: 'usd';
  productName: string;
  expiresAtUnix: number;
  metadata: Record<string, string>;
}

export interface HoldContext { sessionId?: string; userMessage?: string; channel?: 'chat' | 'voice' | 'whatsapp' | 'admin'; language?: 'es' | 'en' }

async function resolveDb(deps: BookingHoldDeps) {
  if (deps.db !== undefined) return deps.db;
  return (await import('./bookingService')).getFirestoreDb() as any;
}

async function findOne(db: NonNullable<BookingHoldDeps['db']>, collection: string, field: string, value: string): Promise<DocSnap | null> {
  const snap = await db.collection(collection).where(field, '==', value).limit(1).get();
  return snap.docs[0] || null;
}

const money = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Number(v.toFixed(2)) : null);

/** Aparta una cotización vigente de la misma sesión. No cobra. */
export async function holdBooking(input: { quoteNumber?: unknown }, context: HoldContext = {}, deps: BookingHoldDeps = {}) {
  try {
    const quoteNumber = String(input.quoteNumber ?? '').trim().toUpperCase();
    if (!QUOTE_NUMBER.test(quoteNumber)) return { success: false as const, held: false, error: 'invalid_quote_number' };
    const sessionHash = hashIdentifier('session', context.sessionId);
    if (!sessionHash) return { success: false as const, held: false, error: 'session_required' };
    const db = await resolveDb(deps);
    if (!db) return { success: false as const, held: false, error: 'storage_unavailable' };
    const now = (deps.now ?? (() => new Date()))();

    const quoteDoc = await findOne(db, AGENT_QUOTE_COLLECTION, 'quoteNumber', quoteNumber);
    const quote = quoteDoc?.data();
    if (!quoteDoc || !quote || quote.sessionIdHash !== sessionHash) return { success: false as const, held: false, error: 'quote_not_found' };
    if (quote.status !== 'quoted') return { success: false as const, held: false, error: 'quote_not_holdable' };
    const quoteExpiry = Date.parse(String(quote.expiresAt || ''));
    if (!Number.isFinite(quoteExpiry) || quoteExpiry <= now.getTime()) return { success: false as const, held: false, error: 'quote_expired', next: 'create_quote' };
    const total = money(quote.clientPriceUSD);
    if (total === null) return { success: false as const, held: false, error: 'quote_without_price', next: 'create_ticket' };

    // Idempotente: un apartado vigente por cotización.
    const existing = await findOne(db, AGENT_HOLD_COLLECTION, 'quoteId', quoteDoc.id);
    const ex = existing?.data();
    if (ex && ex.status === 'held' && Date.parse(String(ex.expiresAt)) > now.getTime()) {
      return { success: true as const, held: true, reused: true, holdNumber: String(ex.holdNumber), status: 'held' as const, quoteNumber, totalPrice: total, currency: 'USD', expiresAt: String(ex.expiresAt), charged: false };
    }

    const expiresAt = new Date(Math.min(quoteExpiry, now.getTime() + HOLD_DURATION_MINUTES * 60_000)).toISOString();
    const holdNumber = buildNumber('HLD', now, (deps.randomHex ?? (() => crypto.randomBytes(2).toString('hex')))());
    await db.collection(AGENT_HOLD_COLLECTION).add({
      holdNumber,
      status: 'held',
      quoteId: quoteDoc.id,
      quoteNumber,
      tourId: String(quote.tourId || ''),
      date: String(quote.date || ''),
      pax: Number(quote.pax) || null,
      currency: 'USD',
      totalPrice: total,
      sessionIdHash: sessionHash,
      channel: context.channel ?? null,
      language: context.language ?? null,
      charged: false,
      timestamp: now.toISOString(),
      expiresAt,
      source: 'agent_phase_c',
      createdAt: FieldValue.serverTimestamp(),
    });
    return {
      success: true as const, held: true, holdNumber, status: 'held' as const, quoteNumber, totalPrice: total, currency: 'USD', expiresAt, charged: false,
      message: `Quote held for up to ${HOLD_DURATION_MINUTES} minutes at the quoted price. Nothing was charged and operator availability is not yet confirmed.`,
    };
  } catch {
    return { success: false as const, held: false, error: 'storage_write_failed' };
  }
}

async function defaultCreateCheckoutSession(params: CheckoutParams) {
  const [{ getStripe }, { checkoutOrigin }] = await Promise.all([import('./bookingService'), import('./commercePolicy')]);
  const stripe = getStripe(); // assertStripeTestMode dentro de getStripe.
  if (!stripe) throw Object.assign(new Error('stripe_not_configured'), { code: 'stripe_not_configured' });
  const origin = checkoutOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ price_data: { currency: params.currency, product_data: { name: params.productName }, unit_amount: params.amountCents }, quantity: 1 }],
    metadata: params.metadata,
    expires_at: params.expiresAtUnix,
    success_url: `${origin}/?booking=pending&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?booking=canceled`,
  });
  return { id: session.id, url: session.url };
}

/** Convierte un apartado vigente en reserva pendiente + enlace de pago Stripe TEST. */
export async function confirmBooking(input: { holdNumber?: unknown }, context: HoldContext = {}, deps: BookingHoldDeps = {}) {
  try {
    const holdNumber = String(input.holdNumber ?? '').trim().toUpperCase();
    if (!HOLD_NUMBER.test(holdNumber)) return { success: false as const, created: false, error: 'invalid_hold_number' };
    if (!isExplicitConfirmation(context.userMessage)) {
      return { success: false as const, created: false, error: 'explicit_confirmation_required', message: 'Ask the customer to confirm explicitly (e.g. "Sí, confirmo" / "Yes, I confirm") after showing the summary.' };
    }
    const sessionHash = hashIdentifier('session', context.sessionId);
    if (!sessionHash) return { success: false as const, created: false, error: 'session_required' };

    // Guardia Stripe antes de tocar datos: solo TEST.
    const mode = (deps.stripeMode ?? checkStripeMode)();
    if (mode.blocked) return { success: false as const, created: false, error: 'stripe_live_blocked' };
    if (mode.mode === 'live') return { success: false as const, created: false, error: 'stripe_test_only' };
    if (mode.mode === 'none') return { success: false as const, created: false, error: 'stripe_not_configured', next: 'create_ticket' };

    const db = await resolveDb(deps);
    if (!db) return { success: false as const, created: false, error: 'storage_unavailable' };
    const now = (deps.now ?? (() => new Date()))();

    const holdDoc = await findOne(db, AGENT_HOLD_COLLECTION, 'holdNumber', holdNumber);
    const hold = holdDoc?.data();
    if (!holdDoc || !hold || hold.sessionIdHash !== sessionHash) return { success: false as const, created: false, error: 'hold_not_found' };
    if (hold.status !== 'held') return { success: false as const, created: false, error: 'hold_not_active' };
    const holdExpiry = Date.parse(String(hold.expiresAt || ''));
    if (!Number.isFinite(holdExpiry) || holdExpiry <= now.getTime()) return { success: false as const, created: false, error: 'hold_expired', next: 'hold_booking' };
    const total = money(hold.totalPrice);
    if (total === null) return { success: false as const, created: false, error: 'hold_without_price', next: 'create_ticket' };

    // Idempotente: una reserva pendiente por apartado.
    const existing = await findOne(db, AGENT_BOOKING_COLLECTION, 'holdId', holdDoc.id);
    const ex = existing?.data();
    if (ex) {
      return { success: true as const, created: false, reused: true, bookingNumber: String(ex.bookingNumber), status: String(ex.status), paymentStatus: String(ex.paymentStatus), paymentUrl: ex.paymentUrl ?? null, mode: 'test' as const, totalPrice: total, currency: 'USD' };
    }

    const bookingNumber = buildNumber('AGB', now, (deps.randomHex ?? (() => crypto.randomBytes(2).toString('hex')))());
    const expiresAtMs = Math.min(now.getTime() + CHECKOUT_MAX_MS, Math.max(now.getTime() + CHECKOUT_MIN_MS, holdExpiry));
    const session = await (deps.createCheckoutSession ?? defaultCreateCheckoutSession)({
      amountCents: Math.round(total * 100),
      currency: 'usd',
      productName: `Costa Rica Tours — ${String(hold.tourId || 'tour')} — ${String(hold.date || '')} — ${Number(hold.pax) || 1} pax`.slice(0, 120),
      expiresAtUnix: Math.floor(expiresAtMs / 1000),
      // Sin bookingId: el webhook actual no reconcilia esta reserva; el dueño la verifica a mano.
      metadata: { agentBookingNumber: bookingNumber, holdNumber, quoteNumber: String(hold.quoteNumber || ''), source: 'agent_confirm_booking' },
    });
    if (!session?.id || !session.url) return { success: false as const, created: false, error: 'checkout_unavailable' };

    await db.collection(AGENT_BOOKING_COLLECTION).add({
      bookingNumber,
      status: 'pending_supplier_verification',
      paymentStatus: 'payment_link_created',
      stripeMode: 'test',
      checkoutSessionId: session.id,
      paymentUrl: session.url,
      paymentLinkExpiresAt: new Date(expiresAtMs).toISOString(),
      holdId: holdDoc.id,
      holdNumber,
      quoteNumber: String(hold.quoteNumber || ''),
      tourId: String(hold.tourId || ''),
      date: String(hold.date || ''),
      pax: Number(hold.pax) || null,
      currency: 'USD',
      totalPrice: total,
      sessionIdHash: sessionHash,
      channel: context.channel ?? null,
      language: context.language ?? null,
      supplierVerified: false,
      supplierPayout: 'manual_owner_only',
      timestamp: now.toISOString(),
      source: 'agent_phase_c',
      createdAt: FieldValue.serverTimestamp(),
    });
    return {
      success: true as const,
      created: true,
      bookingNumber,
      status: 'pending_supplier_verification' as const,
      paymentStatus: 'payment_link_created' as const,
      paymentUrl: session.url,
      mode: 'test' as const,
      totalPrice: total,
      currency: 'USD',
      message: 'Booking is PENDING: our team verifies availability with the local operator before confirming. Stripe TEST mode: no real charge. Never say the booking is confirmed or paid.',
    };
  } catch (err: any) {
    if (String(err?.message || '').startsWith('STRIPE_LIVE_BLOCKED')) return { success: false as const, created: false, error: 'stripe_live_blocked' };
    if (err?.code === 'stripe_not_configured') return { success: false as const, created: false, error: 'stripe_not_configured', next: 'create_ticket' };
    return { success: false as const, created: false, error: 'confirm_failed' };
  }
}
