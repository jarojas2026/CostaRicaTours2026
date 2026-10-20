/**
 * Contrato de la solicitud de cotización desde la ficha /tour/:id.
 *
 * Lo usan el formulario (buildTourQuoteLeadPayload) y el endpoint
 * POST /api/leads/quote-request (parseTourQuoteLeadPayload). Sin consentimiento
 * expreso (Ley 8968) no se envía ni se acepta la solicitud: el formulario lo
 * exige y el servidor lo vuelve a validar.
 */

export const TOUR_QUOTE_SOURCE = 'tour_page' as const;
export const TOUR_QUOTE_ENDPOINT = '/api/leads/quote-request';

/**
 * Referencia corta y pública de una solicitud (p. ej. "CRT-1A2B3C4D") a partir del id del lead.
 * El id ya es un hash: la referencia no contiene correo, nombre ni teléfono.
 */
export function leadPublicReference(leadId: unknown): string | null {
  const raw = String(leadId ?? '').replace(/^lead_/, '').replace(/[^a-zA-Z0-9]/g, '');
  return raw.length >= 6 ? `CRT-${raw.slice(0, 8).toUpperCase()}` : null;
}

export interface TourQuoteFormInput {
  tourId: string;
  name: string;
  email: string;
  /** Fecha aproximada en texto libre ("mediados de marzo", "2027-03-15"). */
  approxDate: string;
  people: number | string;
  message: string;
  consent: boolean;
  language: 'es' | 'en';
}

export interface TourQuoteLeadPayload {
  source: typeof TOUR_QUOTE_SOURCE;
  tourId: string;
  language: 'es' | 'en';
  consent: true;
  customer: { name: string; email: string };
  request: { approxDate?: string; people: number };
  message?: string;
}

export type TourQuoteError = 'consent_required' | 'tour_required' | 'name_required' | 'email_invalid' | 'people_invalid';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const TOUR_ID_RE = /^[a-zA-Z0-9_-]{1,120}$/;
const clean = (value: unknown, max: number) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function validate(input: { tourId: unknown; name: unknown; email: unknown; people: unknown; consent: unknown }):
  | { ok: true; tourId: string; name: string; email: string; people: number }
  | { ok: false; error: TourQuoteError } {
  if (input.consent !== true) return { ok: false, error: 'consent_required' };
  const tourId = clean(input.tourId, 120);
  if (!TOUR_ID_RE.test(tourId)) return { ok: false, error: 'tour_required' };
  const name = clean(input.name, 120);
  if (name.length < 2) return { ok: false, error: 'name_required' };
  const email = clean(input.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'email_invalid' };
  const people = Number(input.people);
  if (!Number.isInteger(people) || people < 1 || people > 60) return { ok: false, error: 'people_invalid' };
  return { ok: true, tourId, name, email, people };
}

/** Arma el cuerpo que el formulario envía. Devuelve un error si falta el consentimiento u otro campo. */
export function buildTourQuoteLeadPayload(input: TourQuoteFormInput):
  | { ok: true; payload: TourQuoteLeadPayload }
  | { ok: false; error: TourQuoteError } {
  const checked = validate(input);
  if (!checked.ok) return checked;
  const approxDate = clean(input.approxDate, 80);
  const message = clean(input.message, 1000);
  return {
    ok: true,
    payload: {
      source: TOUR_QUOTE_SOURCE,
      tourId: checked.tourId,
      language: input.language === 'en' ? 'en' : 'es',
      consent: true,
      customer: { name: checked.name, email: checked.email },
      request: { people: checked.people, ...(approxDate ? { approxDate } : {}) },
      ...(message ? { message } : {}),
    },
  };
}

/** Validación del lado servidor: nunca confía en el cliente. */
export function parseTourQuoteLeadPayload(body: unknown):
  | { ok: true; payload: TourQuoteLeadPayload }
  | { ok: false; error: TourQuoteError | 'source_invalid' } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, any>;
  if (b.source !== TOUR_QUOTE_SOURCE) return { ok: false, error: 'source_invalid' };
  return buildTourQuoteLeadPayload({
    tourId: b.tourId,
    name: b.customer?.name,
    email: b.customer?.email,
    people: b.request?.people,
    approxDate: b.request?.approxDate,
    message: b.message,
    consent: b.consent === true,
    language: b.language === 'en' ? 'en' : 'es',
  });
}

/** Si la fecha aproximada es ISO (AAAA-MM-DD) se puede guardar como fecha del lead. */
export function isoDateOrUndefined(value?: string): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}
