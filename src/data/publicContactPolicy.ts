/**
 * Política pública de contactos (decisión del dueño, 2026-10-19).
 *
 * En el mapa y en todo el sitio público no se muestra teléfono, WhatsApp, correo, web
 * ni dirección exacta de negocios o proveedores: la plataforma gestiona cada solicitud.
 * Se muestran nombre, categoría y ubicación aproximada, más el botón
 * "Solicitar / consultar con nosotros".
 *
 * Excepción: servicios de emergencia públicos (911, CCSS, hospitales, policía,
 * bomberos, Cruz Roja) conservan su teléfono público oficial.
 */

/** Ruta del flujo existente para consultas: el asistente de la plataforma. */
export const PUBLIC_REQUEST_PATH = '/ai';

export const PUBLIC_REQUEST_LABEL = {
  es: 'Solicitar / consultar con nosotros',
  en: 'Request / ask us',
} as const;

export const PUBLIC_REQUEST_HINT = {
  es: 'Gestionamos su solicitud: disponibilidad, precio y reserva sin que tenga que contactar al negocio.',
  en: 'We handle your request: availability, price and booking, with no need to contact the business.',
} as const;

/** Capas del mapa nacional que son servicios de emergencia o red pública de salud. */
const EMERGENCY_LAYERS = new Set(['emergencia', 'ccss']);
/** Tipos de otras capas que también son servicio público de emergencia. */
const EMERGENCY_TYPES = new Set(['salud:Hospital']);

/** true si el punto es un servicio público de emergencia (puede mostrar su teléfono oficial). */
export const isPublicEmergencyPoi = (grupo: string, tipo?: string): boolean =>
  EMERGENCY_LAYERS.has(grupo) || EMERGENCY_TYPES.has(`${grupo}:${tipo ?? ''}`);

/** Capas de negocios: nunca se muestra su dirección exacta (solo el punto aproximado). */
export const BUSINESS_POI_LAYERS = new Set(['alimentacion', 'hospedaje', 'servicios', 'atracciones', 'cultura', 'transporte', 'salud']);
