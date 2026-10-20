/**
 * Contrato de la consulta de un servicio del mapa (hotel, parque, transporte).
 *
 * Los servicios del mapa NO son tours del catálogo: no se envían a /api/bookings
 * (que exige un tour del catálogo y devolvía error al cliente). Van al flujo de
 * leads (POST /api/leads/map-service-request) como solicitud de cotización, con
 * consentimiento Ley 8968 y el mismo antiabuso de /api/leads/quote-request.
 */

export const MAP_SERVICE_QUOTE_SOURCE = 'map_service' as const;
export const MAP_SERVICE_QUOTE_ENDPOINT = '/api/leads/map-service-request';

export interface MapServiceQuoteFormInput {
  serviceId: string;
  name: string;
  email: string;
  phone?: string;
  date?: string;
  checkOutDate?: string;
  adults: number | string;
  children?: number | string;
  message?: string;
  consent: boolean;
  language: 'es' | 'en';
}

export interface MapServiceQuoteLeadPayload {
  source: typeof MAP_SERVICE_QUOTE_SOURCE;
  serviceId: string;
  language: 'es' | 'en';
  consent: true;
  customer: { name: string; email: string; phone?: string };
  request: { date?: string; checkOutDate?: string; adults: number; children: number };
  message?: string;
}

export type MapServiceQuoteError = 'consent_required' | 'service_required' | 'name_required' | 'email_invalid' | 'people_invalid';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const ID_RE = /^[a-zA-Z0-9_-]{1,120}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const clean = (value: unknown, max: number) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const isoOrUndefined = (value: unknown) => { const v = clean(value, 10); return ISO_DATE_RE.test(v) ? v : undefined; };

export function buildMapServiceQuoteLeadPayload(input: MapServiceQuoteFormInput):
  | { ok: true; payload: MapServiceQuoteLeadPayload }
  | { ok: false; error: MapServiceQuoteError } {
  if (input.consent !== true) return { ok: false, error: 'consent_required' };
  const serviceId = clean(input.serviceId, 120);
  if (!ID_RE.test(serviceId)) return { ok: false, error: 'service_required' };
  const name = clean(input.name, 120);
  if (name.length < 2) return { ok: false, error: 'name_required' };
  const email = clean(input.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'email_invalid' };
  const adults = Number(input.adults);
  const children = Number(input.children ?? 0);
  if (!Number.isInteger(adults) || !Number.isInteger(children) || adults < 1 || children < 0 || adults + children > 60) {
    return { ok: false, error: 'people_invalid' };
  }
  const phone = clean(input.phone, 40);
  const message = clean(input.message, 1000);
  const date = isoOrUndefined(input.date);
  const checkOutDate = isoOrUndefined(input.checkOutDate);
  return {
    ok: true,
    payload: {
      source: MAP_SERVICE_QUOTE_SOURCE,
      serviceId,
      language: input.language === 'en' ? 'en' : 'es',
      consent: true,
      customer: { name, email, ...(phone ? { phone } : {}) },
      request: { adults, children, ...(date ? { date } : {}), ...(checkOutDate ? { checkOutDate } : {}) },
      ...(message ? { message } : {}),
    },
  };
}

/** Validación del lado servidor: nunca confía en el cliente. */
export function parseMapServiceQuoteLeadPayload(body: unknown):
  | { ok: true; payload: MapServiceQuoteLeadPayload }
  | { ok: false; error: MapServiceQuoteError | 'source_invalid' } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, any>;
  if (b.source !== MAP_SERVICE_QUOTE_SOURCE) return { ok: false, error: 'source_invalid' };
  return buildMapServiceQuoteLeadPayload({
    serviceId: b.serviceId,
    name: b.customer?.name,
    email: b.customer?.email,
    phone: b.customer?.phone,
    date: b.request?.date,
    checkOutDate: b.request?.checkOutDate,
    adults: b.request?.adults,
    children: b.request?.children ?? 0,
    message: b.message,
    consent: b.consent === true,
    language: b.language === 'en' ? 'en' : 'es',
  });
}
