/**
 * Antiabuso gratuito para formularios públicos (cotización, contacto, /participar).
 *
 * El formulario envía dos campos extra que el servidor valida y elimina antes de
 * procesar la solicitud:
 * - HONEYPOT_FIELD: input oculto para personas; si llega con texto es un bot.
 * - STARTED_AT_FIELD: ms epoch en que se mostró el formulario; envíos más rápidos
 *   que FORM_MIN_FILL_MS se rechazan con un mensaje amable.
 */

export const HONEYPOT_FIELD = 'website' as const;
export const STARTED_AT_FIELD = 'formStartedAt' as const;
export const FORM_MIN_FILL_MS = 3_000;
export const FORM_RATE_LIMIT = { windowMs: 10 * 60_000, max: 5 } as const;

export type FormGuardFields = { [HONEYPOT_FIELD]: string; [STARTED_AT_FIELD]: number };

/** Campos que el cliente agrega al cuerpo JSON. */
export function formGuardFields(startedAt: number, honeypotValue = ''): FormGuardFields {
  return { [HONEYPOT_FIELD]: honeypotValue, [STARTED_AT_FIELD]: startedAt };
}

export const FORM_GUARD_MESSAGES = {
  rate_limited: {
    es: 'Recibimos varias solicitudes desde tu conexión. Espera unos minutos e inténtalo de nuevo, o escríbenos por WhatsApp.',
    en: 'We received several requests from your connection. Please wait a few minutes and try again, or message us on WhatsApp.',
  },
  too_fast: {
    es: 'Enviaste el formulario muy rápido. Revisa los datos y vuelve a enviarlo en unos segundos.',
    en: 'The form was sent very quickly. Please check your details and send it again in a few seconds.',
  },
} as const;

export type FormGuardCode = keyof typeof FORM_GUARD_MESSAGES;
