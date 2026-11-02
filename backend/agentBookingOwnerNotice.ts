/**
 * Aviso al dueño de cada reserva nueva del asistente (`agent_bookings`, status 'pendiente_pago')
 * y lista de solo lectura para el panel de administración.
 *
 * Aviso ($0, reutiliza lo existente): `createAlert` de backend/alertService.ts
 *  - guarda la alerta en `admin_alerts` (visible en el Centro de Alertas del panel admin), y
 *  - envía correo a ADMIN_ALERT_EMAIL por SMTP/Gmail (nodemailer) SOLO si el dueño configuró
 *    SMTP_USER + SMTP_PASS + ADMIN_ALERT_EMAIL; sin esas variables queda solo en el panel.
 *  Además deja un evento estructurado en el log del servidor (`agent_booking_created`).
 *  No usa ningún servicio pago nuevo.
 *
 * Privacidad: el mensaje usa lista blanca (código AGB, tour del catálogo, fecha, personas, total
 * cotizado, idioma del cliente). Nunca proveedor/operador, costo, comisión, margen ni la sesión.
 * El título del tour pasa por redactProviderIdentityForCustomer con los nombres del operador.
 *
 * Nunca lanza: si el aviso falla, la reserva ya creada no se ve afectada.
 */
import { findCatalogTour } from './agentProductTools';
import { redactProviderIdentityForCustomer } from './customerOutboundPrivacy';

export const AGENT_BOOKING_ALERT_SOURCE = 'Reservas del asistente (agent_bookings)';
export const AGENT_BOOKING_CREATED_EVENT = 'agent_booking_created';
export const AGENT_BOOKINGS_LIST_MAX = 100;

const BOOKING_NUMBER = /^AGB-\d{8}-[A-F0-9]{4}$/;

export interface AgentBookingNoticeInput {
  bookingNumber: string;
  tourId?: string;
  date?: string;
  pax?: number | null;
  totalPrice?: number | null;
  currency?: string;
  language?: string | null;
  channel?: string | null;
  status?: string;
  paymentStatus?: string;
}

/** Título público del tour del catálogo, sin identidad del operador. '' si no está en el catálogo. */
export function safeTourTitle(tourId: unknown, lang: 'es' | 'en' = 'es'): string {
  const id = String(tourId ?? '').trim();
  if (!id) return '';
  let tour: any;
  try { tour = findCatalogTour(id); } catch { tour = undefined; }
  if (!tour) return '';
  const raw = String(tour?.title?.[lang] || tour?.title?.es || tour?.title?.en || '');
  const providerNames = [tour?.operatorName, tour?.providerId, tour?.operatorId].filter((n: unknown): n is string => typeof n === 'string' && n.length >= 3);
  return redactProviderIdentityForCustomer(raw, { language: lang, providerNames }).slice(0, 160);
}

const langLabel = (l: unknown) => (l === 'en' ? 'inglés (en)' : l === 'es' ? 'español (es)' : 'no indicado');
const moneyText = (v: unknown, cur: unknown) => (typeof v === 'number' && Number.isFinite(v) ? `${String(cur || 'USD')} ${v.toFixed(2)}` : 'sin total');

/** Contenido del aviso al dueño (lista blanca). */
export function buildAgentBookingOwnerNotice(booking: AgentBookingNoticeInput) {
  const code = String(booking.bookingNumber || '');
  const tourTitle = safeTourTitle(booking.tourId, 'es');
  const tourLine = tourTitle ? `${tourTitle} (${String(booking.tourId || '')})` : (String(booking.tourId || '') || 'no indicado');
  const pax = typeof booking.pax === 'number' && booking.pax > 0 ? booking.pax : null;
  const title = `Nueva reserva ${code} pendiente de pago`;
  const message = [
    `Reserva: ${code}`,
    `Tour: ${tourLine}`,
    `Fecha: ${booking.date || 'no indicada'}`,
    `Personas: ${pax ?? 'no indicado'}`,
    `Total cotizado: ${moneyText(booking.totalPrice, booking.currency)}`,
    `Idioma del cliente: ${langLabel(booking.language)}`,
    `Estado: ${booking.status || 'pendiente_pago'} / ${booking.paymentStatus || 'awaiting_payment_instructions'}`,
    'Siguiente paso: verificar disponibilidad con el operador y enviar al cliente las instrucciones de pago. No se cobró nada.',
  ].join('\n');
  const metadata = {
    kind: AGENT_BOOKING_CREATED_EVENT,
    bookingNumber: code,
    tourId: String(booking.tourId || ''),
    tourTitle,
    date: String(booking.date || ''),
    pax,
    totalPrice: typeof booking.totalPrice === 'number' ? booking.totalPrice : null,
    currency: String(booking.currency || 'USD'),
    language: booking.language === 'en' || booking.language === 'es' ? booking.language : null,
    channel: booking.channel ?? null,
  };
  return { source: AGENT_BOOKING_ALERT_SOURCE, severity: 'warning' as const, title, message, metadata };
}

export interface OwnerNoticeDeps {
  createAlert?: (alert: ReturnType<typeof buildAgentBookingOwnerNotice>) => Promise<unknown>;
  log?: (line: string) => void;
}

/** Avisa al dueño (alerta admin + correo si está configurado) y registra el evento. Nunca lanza. */
export async function notifyOwnerOfAgentBooking(booking: AgentBookingNoticeInput, deps: OwnerNoticeDeps = {}): Promise<{ notified: boolean; channel: 'admin_alert' | 'log_only' }> {
  if (!BOOKING_NUMBER.test(String(booking?.bookingNumber || ''))) return { notified: false, channel: 'log_only' };
  let notice: ReturnType<typeof buildAgentBookingOwnerNotice>;
  try { notice = buildAgentBookingOwnerNotice(booking); } catch { return { notified: false, channel: 'log_only' }; }
  const log = deps.log ?? ((line: string) => console.info(line));
  try { log(JSON.stringify({ event: AGENT_BOOKING_CREATED_EVENT, ...notice.metadata })); } catch { /* el log nunca rompe */ }
  try {
    const create = deps.createAlert ?? (async (alert) => (await import('./alertService')).createAlert(alert));
    await create(notice);
    return { notified: true, channel: 'admin_alert' };
  } catch {
    return { notified: false, channel: 'log_only' };
  }
}

// ---------------------------------------------------------------------------
// Lista de solo lectura para el dueño (GET /api/admin/agent-bookings)
// ---------------------------------------------------------------------------

export interface AgentBookingView {
  id: string;
  bookingNumber: string;
  status: string;
  paymentStatus: string;
  tourId: string;
  tourTitle: string;
  date: string;
  pax: number | null;
  totalPrice: number | null;
  currency: string;
  language: string | null;
  channel: string | null;
  paymentInstructionsSent: boolean;
  supplierVerified: boolean;
  createdAt: string;
}

/** Lista blanca: nunca sessionIdHash, proveedor, costo ni margen. */
export function toAgentBookingView(id: string, d: Record<string, any>): AgentBookingView {
  return {
    id: String(id),
    bookingNumber: String(d.bookingNumber || ''),
    status: String(d.status || ''),
    paymentStatus: String(d.paymentStatus || ''),
    tourId: String(d.tourId || ''),
    tourTitle: safeTourTitle(d.tourId, 'es'),
    date: String(d.date || ''),
    pax: typeof d.pax === 'number' ? d.pax : null,
    totalPrice: typeof d.totalPrice === 'number' ? d.totalPrice : null,
    currency: String(d.currency || 'USD'),
    language: d.language === 'en' || d.language === 'es' ? d.language : null,
    channel: typeof d.channel === 'string' ? d.channel : null,
    paymentInstructionsSent: d.paymentInstructionsSent === true,
    supplierVerified: d.supplierVerified === true,
    createdAt: String(d.timestamp || ''),
  };
}

export interface ListAgentBookingsDeps {
  db?: {
    collection: (name: string) => {
      orderBy: (field: string, dir: 'desc') => { limit: (n: number) => { get: () => Promise<{ docs: Array<{ id: string; data: () => Record<string, any> | undefined }> }> } };
    };
  } | null;
}

/** Reservas del asistente, más nuevas primero (solo lectura). */
export async function listAgentBookings(opts: { limit?: unknown } = {}, deps: ListAgentBookingsDeps = {}): Promise<{ ok: true; bookings: AgentBookingView[] } | { ok: false; error: 'storage_unavailable' | 'read_failed' }> {
  try {
    const n = Math.min(AGENT_BOOKINGS_LIST_MAX, Math.max(1, Math.floor(Number(opts.limit) || 50)));
    const db = deps.db !== undefined ? deps.db : ((await import('./bookingService')).getFirestoreDb() as any);
    if (!db) return { ok: false, error: 'storage_unavailable' };
    const { AGENT_BOOKING_COLLECTION } = await import('./agentBookingHold');
    const snap = await db.collection(AGENT_BOOKING_COLLECTION).orderBy('timestamp', 'desc').limit(n).get();
    const bookings = snap.docs.map((doc: any) => toAgentBookingView(doc.id, doc.data() || {}));
    return { ok: true, bookings };
  } catch {
    return { ok: false, error: 'read_failed' };
  }
}
