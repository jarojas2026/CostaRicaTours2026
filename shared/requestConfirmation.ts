/**
 * Confirmación pública de una solicitud (#387, complemento de #364).
 *
 * Toda solicitud enviada termina en una confirmación visible con su referencia
 * pública `CRT-XXXXXXXX` y, como opción, un enlace a WhatsApp oficial con un
 * mensaje precargado. El mensaje solo lleva la referencia: nunca nombre, correo,
 * teléfono ni datos del proveedor (Ley 8968, AGENTS.md §12). No se envía nada
 * automáticamente: el cliente decide si abre WhatsApp.
 */

/** Número oficial de atención de la plataforma (no es de ningún proveedor). */
export const OFFICIAL_WHATSAPP_NUMBER = '50687959148';

const PUBLIC_REFERENCE_RE = /^CRT-[A-Z0-9]{6,8}$/;

export function isPublicRequestReference(value: unknown): value is string {
  return typeof value === 'string' && PUBLIC_REFERENCE_RE.test(value);
}

export function requestFollowUpWhatsAppMessage(reference: string, language: 'es' | 'en'): string {
  return language === 'en'
    ? `Hi Costa Rica Tours, I just sent request ${reference} and would like to follow up.`
    : `Hola Costa Rica Tours, acabo de enviar la solicitud ${reference} y quisiera darle seguimiento.`;
}

/** Deep-link wa.me con mensaje precargado, o null si la referencia no es válida. */
export function requestFollowUpWhatsAppUrl(reference: unknown, language: 'es' | 'en'): string | null {
  if (!isPublicRequestReference(reference)) return null;
  return `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(requestFollowUpWhatsAppMessage(reference, language))}`;
}
