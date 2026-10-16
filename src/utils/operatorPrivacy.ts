import type { Tour } from '../types';

/**
 * Decisión del negocio: el cliente no ve datos que identifiquen al operador (nombre,
 * oficina, teléfonos, correo, WhatsApp, web, enlaces de fuente) antes de reservar.
 * La identidad del operador se comunica en la confirmación de la reserva.
 *
 * Textos neutrales y veraces: la mayoría de operadores aún son prospectos sin verificar,
 * por eso nunca se afirma que todos estén certificados por el ICT.
 */
export const SUPPLIER_POLICY = {
  es: 'Trabajamos con operadores locales; verificamos su declaratoria turística del ICT antes de confirmar cada reserva.',
  en: 'We work with local operators; we verify their ICT tourism declaration before confirming each booking.',
} as const;

export const OPERATOR_IDENTITY_NOTE = {
  es: 'La identidad del operador se indica en la confirmación de la reserva.',
  en: 'The operator’s identity is provided in the booking confirmation.',
} as const;

const SELECTED = { es: 'Operador local seleccionado por Costa Rica Tours', en: 'Local operator selected by Costa Rica Tours' } as const;
const VERIFIED = { es: 'Operador local con declaratoria turística verificada por nuestro equipo', en: 'Local operator with a tourism declaration verified by our team' } as const;

/** Etiqueta neutral del operador. "Verificada" solo cuando el equipo la verificó para ese tour. */
export function neutralOperatorLabel(tour: Pick<Tour, 'operatorIctVerified'>): { es: string; en: string } {
  return tour.operatorIctVerified === true ? VERIFIED : SELECTED;
}

/** Campos de proveedor que nunca deben salir hacia el cliente. */
export const OPERATOR_PRIVATE_FIELDS = ['operatorName', 'operatorLogo', 'sourceUrl', 'inquirySourceUrl', 'operatorEmail', 'operatorPhone', 'operatorWhatsapp', 'operatorWebsite', 'providerName', 'providerContact'] as const;

/** Quita los campos de proveedor de un tour (p. ej. documentos remotos de Firestore). */
export function stripOperatorFields<T extends object>(tour: T): T {
  const copy: Record<string, unknown> = { ...(tour as Record<string, unknown>) };
  for (const field of OPERATOR_PRIVATE_FIELDS) delete copy[field];
  return copy as T;
}
