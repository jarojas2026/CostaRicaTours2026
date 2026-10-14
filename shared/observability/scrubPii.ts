/**
 * Redacción de datos personales para eventos de monitoreo de errores.
 *
 * Compartido por el servidor (@sentry/node) y el frontend (@sentry/react):
 * reemplaza correos y teléfonos en cualquier texto del evento y elimina las
 * secciones que pueden contener PII (usuario, cookies, cabeceras de auth,
 * cuerpos de request). Es una función pura y sin dependencias de Sentry.
 */

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Teléfonos: +506 8795-9148, (506) 8795 9148, 87959148, +1 415 555 0100…
// Exige 8+ dígitos para no tocar montos, fechas cortas ni IDs pequeños.
const PHONE_PATTERN = /(?<![\w-])\+?\(?\d{1,4}\)?(?:[\s.-]?\d){7,14}(?![\w-])/g;

const SENSITIVE_KEYS = /^(?:authorization|cookie|set-cookie|x-chat-session-token|x-crt-internal-token|x-operator-api-key|email|e-mail|correo|phone|telefono|teléfono|whatsapp|password|token|ip_address)$/i;

// Identificadores técnicos que nunca son PII y deben llegar intactos.
const TECHNICAL_KEYS = new Set(['event_id', 'trace_id', 'span_id', 'parent_span_id', 'release', 'dist', 'timestamp', 'start_timestamp', 'lineno', 'colno']);

export const REDACTED = '[redacted]';

const DATE_LIKE = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$|^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/;

export function scrubText(value: string): string {
  return value
    .replace(EMAIL_PATTERN, '[email]')
    .replace(PHONE_PATTERN, (match) => (DATE_LIKE.test(match) ? match : '[phone]'));
}

/** Recursively redacts emails/phones in strings and drops sensitive keys. */
export function scrubValue<T>(value: T, depth = 0): T {
  if (depth > 8) return value;
  if (typeof value === 'string') return scrubText(value) as T;
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.test(key) ? REDACTED
        : TECHNICAL_KEYS.has(key) ? item
          : scrubValue(item, depth + 1);
    }
    return out as T;
  }
  return value;
}

/** Minimal structural view of a Sentry event; avoids importing Sentry types here. */
export interface ScrubbableEvent {
  user?: unknown;
  request?: object;
}

/**
 * beforeSend/beforeSendTransaction hook: the event never carries the user,
 * cookies, request bodies or query strings, and remaining text is scrubbed.
 */
export function scrubEvent<E extends ScrubbableEvent>(event: E): E {
  const copy: E = { ...event };
  delete copy.user;
  if (copy.request) {
    const { cookies: _cookies, data: _data, query_string: _query, ...request } = copy.request as Record<string, unknown>;
    if (typeof request.url === 'string') request.url = request.url.split('?')[0];
    copy.request = request;
  }
  return scrubValue(copy);
}
