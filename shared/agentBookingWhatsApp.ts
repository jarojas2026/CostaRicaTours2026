/**
 * Texto prellenado del botón de WhatsApp que ve el cliente tras crear una reserva pendiente de pago
 * (confirm_booking, colección `agent_bookings`, código AGB-…).
 *
 * Lo usan el backend (acción rápida `direct_whatsapp` con `data`) y el chat del cliente
 * (src/components/AIAssistant.tsx). Incluye código de reserva, tour, fecha y personas para que la
 * agencia identifique la reserva sin preguntar. Nunca incluye proveedor, costo ni margen: solo
 * campos de la lista blanca de abajo.
 */

export const AGENT_BOOKING_NUMBER_PATTERN = /^AGB-\d{8}-[A-F0-9]{4}$/;

export interface AgentBookingWhatsAppInput {
  bookingNumber: unknown;
  tourTitle?: unknown;
  date?: unknown;
  pax?: unknown;
  language?: unknown;
}

const oneLine = (v: unknown, max: number) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);

/** Código AGB válido (mayúsculas) o null. */
export function normalizeAgentBookingNumber(value: unknown): string | null {
  const code = String(value ?? '').trim().toUpperCase();
  return AGENT_BOOKING_NUMBER_PATTERN.test(code) ? code : null;
}

/**
 * Texto prellenado (es/en). null si el código de reserva no es válido: en ese caso el chat usa el
 * mensaje genérico de siempre.
 */
export function buildAgentBookingWhatsAppText(input: AgentBookingWhatsAppInput): string | null {
  const code = normalizeAgentBookingNumber(input.bookingNumber);
  if (!code) return null;
  const en = input.language === 'en';
  const tour = oneLine(input.tourTitle, 120);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(input.date ?? '')) ? String(input.date) : '';
  const paxNum = Number(input.pax);
  const pax = Number.isInteger(paxNum) && paxNum > 0 && paxNum < 1000 ? paxNum : null;
  const details = [
    tour,
    date ? (en ? `date ${date}` : `fecha ${date}`) : '',
    pax ? (en ? `${pax} ${pax === 1 ? 'person' : 'people'}` : `${pax} ${pax === 1 ? 'persona' : 'personas'}`) : '',
  ].filter(Boolean).join(', ');
  return en
    ? `Hi Costa Rica Tours, I have booking ${code} (pending payment)${details ? `: ${details}` : ''}. I would like to receive the payment instructions.`
    : `Hola Costa Rica Tours, tengo la reserva ${code} (pendiente de pago)${details ? `: ${details}` : ''}. Quisiera recibir las instrucciones de pago.`;
}
