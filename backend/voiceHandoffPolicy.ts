/**
 * Línea telefónica con IA — política de traspaso (esqueleto, sin cablear).
 *
 * Regla de negocio: por voz NO se reserva ni se paga. La IA informa, toma los
 * datos básicos y entrega el siguiente paso por canal escrito: formulario de
 * cotización en la web o enlace de pago que genera una persona desde /admin.
 *
 * - VOICE_TRANSACTIONS_BY_VOICE (por defecto false): mientras sea false, las
 *   herramientas transaccionales se quitan del set que ve la IA en canal voz.
 * - Nunca menciona proveedores u operadores; el asistente no tiene nombre.
 * - No envía SMS/WhatsApp/correo por sí mismo (sin autoenvío): solo devuelve el
 *   texto hablado y la URL que un humano o el canal escrito entregará.
 *
 * El webhook de llamada entrante (Twilio-compatible) ya existe en
 * backend/routes/voice.ts tras VOICE_AGENT_DESK_ENABLED. Ver
 * docs/linea-telefonica-ia.md para la línea de cableado.
 */
type Env = NodeJS.ProcessEnv | Record<string, string | undefined>;
const str = (v: string | undefined) => String(v ?? '').trim();

/** Herramientas que mutan reservas o dinero. Se bloquean por nombre y por patrón. */
const TRANSACTIONAL_TOOLS = new Set(['create_reservation']);
const TRANSACTIONAL_PATTERN = /^(create|confirm|cancel|modify|update|pay|charge|refund|checkout|capture)_|(_payment|_checkout|_refund|_charge)$/i;

export function voiceTransactionsAllowed(env: Env = process.env) {
  return str(env.VOICE_TRANSACTIONS_BY_VOICE).toLowerCase() === 'true';
}

export function isTransactionalTool(name: string) {
  return TRANSACTIONAL_TOOLS.has(name) || TRANSACTIONAL_PATTERN.test(name);
}

/** Filtra las declaraciones de herramientas para el canal voz. */
export function filterVoiceTools<T extends { name: string }>(declarations: T[], env: Env = process.env): T[] {
  if (voiceTransactionsAllowed(env)) return declarations;
  return declarations.filter(d => !isTransactionalTool(d.name));
}

export type VoiceIntent = 'book' | 'pay' | 'other';

/** Detección simple de intención transaccional en lo que dijo quien llama (ES/EN). */
export function detectTransactionalIntent(utterance: string): VoiceIntent {
  const t = str(utterance).toLowerCase();
  if (/\b(pagar|pago|tarjeta|sinpe|cobr|pay|payment|card|charge)\w*/.test(t)) return 'pay';
  if (/\b(reserv|apart|book|booking)\w*/.test(t)) return 'book';
  return 'other';
}

/** URL del formulario de cotización (origen público https) o null si no hay origen válido. */
export function quoteFormUrl(env: Env = process.env, tourId?: string): string | null {
  try {
    const url = new URL(str(env.PUBLIC_BASE_URL) || str(env.APP_URL));
    if (url.protocol !== 'https:') return null;
    const safeTour = tourId && /^[a-z0-9-]{2,120}$/.test(tourId) ? tourId : '';
    return `${url.origin}${safeTour ? `/tour/${safeTour}` : '/tours'}`;
  } catch {
    return null;
  }
}

/** Respuesta hablada de traspaso: nunca confirma reserva ni pago, nunca nombra proveedores. */
export function voiceHandoffReply(intent: VoiceIntent, language: 'es' | 'en', env: Env = process.env, tourId?: string) {
  const url = quoteFormUrl(env, tourId);
  const site = url ? new URL(url).host : '';
  if (language === 'en') {
    const where = site ? ` on ${site}` : ' on our website';
    return intent === 'pay'
      ? `For your security we never take payments by phone. Please request your quote${where}; once a person verifies availability, you will receive a secure payment link in writing.`
      : `I can't confirm reservations by phone. Please send the quote request${where}; a person will verify availability and price and reply in writing.`;
  }
  const where = site ? ` en ${site}` : ' en nuestra web';
  return intent === 'pay'
    ? `Por seguridad nunca recibimos pagos por teléfono. Solicite su cotización${where}; cuando una persona verifique disponibilidad, recibirá por escrito un enlace de pago seguro.`
    : `No puedo confirmar reservas por teléfono. Envíe la solicitud de cotización${where}; una persona verificará disponibilidad y precio y le responderá por escrito.`;
}
