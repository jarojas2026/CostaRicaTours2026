/**
 * Pipeline automático de leads.
 *
 * Cada consulta (handoff de Sofía, formulario de contacto, solicitud de
 * reserva que queda pendiente) se convierte en un registro `leads` con:
 *  - máquina de estados nuevo → cotizando → esperando_operador →
 *    confirmado_por_escrito → pagado, con cancelado desde cualquier estado
 *    no terminal;
 *  - deduplicación por contacto/sesión + experiencia + fecha;
 *  - consentimiento (Ley 8968): sin consentimiento expreso no se guardan
 *    nombre, correo ni teléfono, y el texto libre se guarda redactado;
 *  - operadores candidatos (prospectos de data/operators, NO verificados) por
 *    región/actividad y un borrador de solicitud de cotización ES/EN por
 *    operador. Los borradores se GUARDAN, nunca se envían.
 *
 * Nada aquí confirma reservas, cobra ni contacta a terceros. La única
 * notificación es la alerta interna existente (admin_alerts + correo a
 * ADMIN_ALERT_EMAIL si SMTP ya está configurado) para Jose.
 */

import crypto from 'crypto';
import { getFirestoreDb } from './bookingService';
import { OPERATOR_PROSPECTS, type OperatorProspect } from '../data/operators/operatorProspects';
import { operatorSourceForTour } from './operatorSourcesInternal';
import type { ConciergeUnderstanding, ConciergeLanguage } from './conciergeUnderstanding';
import type { Tour } from '../src/types';
import { publishedTourPrice } from '../src/utils/tourPublication';
import { isoDateOrUndefined, type TourQuoteLeadPayload } from '../shared/tourQuoteRequest';

export const LEAD_STATUSES = ['nuevo', 'cotizando', 'esperando_operador', 'confirmado_por_escrito', 'pagado', 'cancelado'] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];
export type LeadSource = 'sofia' | 'contact_form' | 'booking_request' | 'tour_page';

const TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  nuevo: ['cotizando', 'cancelado'],
  cotizando: ['esperando_operador', 'cancelado'],
  esperando_operador: ['confirmado_por_escrito', 'cotizando', 'cancelado'],
  confirmado_por_escrito: ['pagado', 'cancelado'],
  pagado: [],
  cancelado: [],
};

/** Estados que exigen evidencia escrita (referencia de la confirmación o del pago). */
const EVIDENCE_REQUIRED: readonly LeadStatus[] = ['confirmado_por_escrito', 'pagado'];
/** Estados que solo owner/admin pueden fijar (no la clave compartida de operador). */
const ADMIN_ONLY: readonly LeadStatus[] = ['pagado'];
export const OPEN_STATUSES: readonly LeadStatus[] = ['nuevo', 'cotizando', 'esperando_operador'];
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const DEDUPE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && (LEAD_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export interface LeadRequest {
  activity?: string;
  activityLabel?: string;
  tourId?: string;
  tourTitle?: string;
  people?: number;
  adults?: number;
  children?: number;
  month?: number;
  date?: string;
  region?: string;
  regionLabel?: string;
  budget?: { amount: number; currency: 'USD' | 'CRC'; per: 'total' | 'person' };
}

export interface OperatorCandidate {
  operatorId: string;
  name: string;
  region: string;
  score: number;
  reasons: string[];
  channels: { email: boolean; whatsapp: boolean; website: boolean };
  verification: OperatorProspect['verification'];
  partnershipStatus: OperatorProspect['partnershipStatus'];
}

export interface QuoteRequestDraft {
  operatorId: string;
  operatorName: string;
  language: ConciergeLanguage;
  subject: string;
  body: string;
  status: 'borrador_no_enviado';
  createdAt: string;
}

export interface LeadStatusChange {
  from: LeadStatus | null;
  to: LeadStatus;
  at: string;
  by: string;
  note?: string;
  evidence?: string;
}

export interface LeadRecord {
  id: string;
  dedupeKey: string;
  status: LeadStatus;
  statusHistory: LeadStatusChange[];
  sources: LeadSource[];
  firstSource: LeadSource;
  createdAt: string;
  updatedAt: string;
  lastInquiryAt: string;
  /** Última acción humana/estado: base para detectar leads sin respuesta (>24h). */
  lastActivityAt: string;
  inquiryCount: number;
  language: ConciergeLanguage;
  request: LeadRequest;
  referenceQuote?: { unitPriceUSD: number; totalUSD?: number; line: string; subjectToConfirmation: true };
  consent: { dataProcessing: boolean; law: 'Ley 8968'; capturedAt?: string; source: LeadSource };
  contact: { name?: string; email?: string; phone?: string } | null;
  contactRedacted: boolean;
  bookingId?: string;
  bookingOutcome?: string;
  messageSnippet?: string;
  operatorCandidates: OperatorCandidate[];
  quoteRequestDrafts: QuoteRequestDraft[];
  /** Si este lead terminó (pagado/cancelado) y el cliente volvió a consultar, id del lead nuevo. */
  reopenedAs?: string;
}

export interface LeadInput {
  source: LeadSource;
  understanding?: ConciergeUnderstanding | null;
  request?: LeadRequest;
  language?: string;
  message?: string;
  sessionId?: string;
  bookingId?: string;
  bookingOutcome?: string;
  consent?: boolean;
  contact?: { name?: unknown; email?: unknown; phone?: unknown } | null;
  referenceQuote?: LeadRecord['referenceQuote'];
}

// ---------------------------------------------------------------------------
// Privacidad
// ---------------------------------------------------------------------------

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /\+?\d[\d\s().-]{6,}\d/g;

/** Quita correos y teléfonos del texto libre (se usa siempre que no hay consentimiento). */
export function redactFreeText(text: string, max = 280): string {
  return String(text || '').replace(EMAIL_RE, '[correo]').replace(PHONE_RE, '[teléfono]').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanContact(input: LeadInput['contact']): LeadRecord['contact'] {
  if (!input || typeof input !== 'object') return null;
  const name = typeof input.name === 'string' ? input.name.trim().slice(0, 120) : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase().slice(0, 200) : '';
  const phone = typeof input.phone === 'string' ? input.phone.replace(/[^\d+]/g, '').slice(0, 20) : '';
  const out: NonNullable<LeadRecord['contact']> = {};
  if (name) out.name = name;
  if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) out.email = email;
  if (phone && phone.replace(/\D/g, '').length >= 8) out.phone = phone;
  return Object.keys(out).length ? out : null;
}

const sha = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/** Clave de deduplicación: identidad (contacto, reserva o sesión) + experiencia + fecha. */
export function computeDedupeKey(input: { contact: LeadRecord['contact']; sessionId?: string; bookingId?: string; request: LeadRequest }): string {
  const identity = input.contact?.email || input.contact?.phone?.replace(/\D/g, '').slice(-8)
    || (input.sessionId ? `s:${input.sessionId}` : '') || (input.bookingId ? `b:${input.bookingId}` : '') || 'anon';
  const subject = input.request.tourId || input.request.activity || input.request.region || 'general';
  const when = input.request.date || (input.request.month ? `m${input.request.month}` : 'sin-fecha');
  return sha(`${identity}|${subject}|${when}`);
}

// ---------------------------------------------------------------------------
// Operadores candidatos y borradores
// ---------------------------------------------------------------------------

/** Región del catálogo → región del dataset de prospectos. */
const REGION_TO_PROSPECT: Record<string, string[]> = {
  arenal: ['La Fortuna/Arenal'],
  sarapiqui: ['La Fortuna/Arenal'],
  monteverde: ['Monteverde'],
  manuel_antonio: ['Manuel Antonio/Quepos'],
  guanacaste: ['Guanacaste/Tamarindo'],
  osa: ['Osa/Corcovado', 'Zona Sur (Uvita/Dominical/Pérez Zeledón)'],
  pacuare: ['Pacuare/Turrialba'],
  tortuguero: ['Tortuguero'],
  sjo: ['San José/Valle Central'],
  caribe: ['Caribe Sur'],
};

const ACTIVITY_TO_TOURS: Record<string, RegExp> = {
  rafting: /rafting|balsa|pacuare/i,
  whale_watching: /ballena|whale|delf[ií]n|dolphin/i,
  canopy: /canopy|zip|tirolesa|sky trek|cables/i,
  snorkel: /snorkel|buceo|diving|isla del ca[ñn]o/i,
  volcanoes: /volc|termal|hot spring/i,
  wildlife: /fauna|perezoso|sloth|nocturn|night|birding|aves|tortuga|turtle|wildlife|corcovado/i,
  culture: /cultur|caf[eé]|coffee|chocolate|ind[ií]gena|bribri/i,
};

export function matchOperatorCandidates(request: LeadRequest, operators: readonly OperatorProspect[] = OPERATOR_PROSPECTS.operators, limit = 3): OperatorCandidate[] {
  const regions = request.region ? REGION_TO_PROSPECT[request.region] || [] : [];
  const activityRe = request.activity ? ACTIVITY_TO_TOURS[request.activity] : undefined;
  // Operador real del tour (archivo interno, solo servidor): va primero si el lead trae tourId.
  const source = operatorSourceForTour(request.tourId);
  const sourceCandidate: OperatorCandidate | undefined = source ? {
    operatorId: source.contacts.prospectId || `src:${source.id}`,
    name: source.operatorName,
    region: request.region || '',
    score: 10,
    reasons: ['operador del tour solicitado (catálogo interno)'],
    channels: { email: Boolean(source.contacts.email), whatsapp: Boolean(source.contacts.phoneWhatsapp), website: Boolean(source.contacts.website) },
    verification: source.ictVerified ? 'verificado_ict' : 'prospecto_no_verificado',
    partnershipStatus: 'sin_contacto',
  } : undefined;
  if (!regions.length && !activityRe) return sourceCandidate ? [sourceCandidate] : [];
  const scored: OperatorCandidate[] = sourceCandidate ? [sourceCandidate] : [];
  for (const op of operators) {
    if (op.partnershipStatus === 'descartado') continue;
    if (sourceCandidate && op.id === sourceCandidate.operatorId) continue;
    const reasons: string[] = [];
    let score = 0;
    const regionHit = regions.includes(op.region);
    if (regions.length && !regionHit) continue;
    if (regionHit) { score += 3; reasons.push(`región ${op.region}`); }
    const tourText = `${op.mainTours.join(' ')} ${op.notes || ''}`;
    const activityHit = activityRe ? activityRe.test(tourText) : false;
    if (activityRe && !activityHit && !regionHit) continue;
    if (activityHit) { score += 2; reasons.push(`ofrece ${request.activityLabel || request.activity}`); }
    if (op.b2bProgram === 'publicado') { score += 1; reasons.push('programa B2B publicado'); }
    if (op.email || op.phoneWhatsapp) score += 0.5;
    scored.push({
      operatorId: op.id,
      name: op.name,
      region: op.region,
      score,
      reasons,
      channels: { email: Boolean(op.email), whatsapp: Boolean(op.phoneWhatsapp), website: Boolean(op.website) },
      verification: op.verification,
      partnershipStatus: op.partnershipStatus,
    });
  }
  return scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, limit);
}

const MONTHS: Record<ConciergeLanguage, string[]> = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

function describeWhen(request: LeadRequest, language: ConciergeLanguage): string {
  if (request.date) return request.date;
  if (request.month) return language === 'es' ? `${MONTHS.es[request.month - 1]} (día por definir)` : `${MONTHS.en[request.month - 1]} (exact day TBD)`;
  return language === 'es' ? 'por definir' : 'to be defined';
}

/**
 * Borrador de solicitud de cotización para un operador. No incluye datos
 * personales del cliente. Se guarda como `borrador_no_enviado`.
 */
export function buildQuoteRequestDraft(op: OperatorCandidate, request: LeadRequest, clientLanguage: ConciergeLanguage, language: ConciergeLanguage, now: Date): QuoteRequestDraft {
  const es = language === 'es';
  const experience = request.tourTitle || request.activityLabel || request.activity || request.regionLabel || (es ? 'experiencia por definir' : 'experience to be defined');
  const when = describeWhen(request, language);
  const party = request.people
    ? (request.adults !== undefined || request.children !== undefined
      ? `${request.people} (${request.adults ?? 0} ${es ? 'adultos' : 'adults'}, ${request.children ?? 0} ${es ? 'niños' : 'children'})`
      : String(request.people))
    : (es ? 'por confirmar' : 'to be confirmed');
  const clientLang = clientLanguage === 'es' ? (es ? 'español' : 'Spanish') : (es ? 'inglés' : 'English');
  const subject = es
    ? `Solicitud de cotización – ${experience} – ${when}`
    : `Quote request – ${experience} – ${when}`;
  const body = es
    ? [
      `Hola, equipo de ${op.name}:`,
      '',
      'Les escribe Jose Rojas, de Costa Rica Tours (Pérez Zeledón). Tenemos una consulta de un cliente y nos gustaría cotizar con ustedes:',
      `• Experiencia: ${experience}`,
      request.regionLabel ? `• Zona: ${request.regionLabel}` : '',
      `• Fecha: ${when}`,
      `• Personas: ${party}`,
      `• Idioma del cliente: ${clientLang}`,
      '',
      '¿Nos podrían indicar disponibilidad, tarifa neta o comisión para agencias, qué incluye y la política de cancelación?',
      'Aún no es una reserva ni hay ningún pago; estamos cotizando para responder al cliente.',
      '',
      'Muchas gracias,',
      'Jose Rojas – Costa Rica Tours',
      'WhatsApp +506 8795 9148',
    ].filter(line => line !== '').join('\n')
    : [
      `Hello ${op.name} team,`,
      '',
      'This is Jose Rojas from Costa Rica Tours (Pérez Zeledón). We have a client inquiry and would like a quote from you:',
      `• Experience: ${experience}`,
      request.regionLabel ? `• Area: ${request.regionLabel}` : '',
      `• Date: ${when}`,
      `• People: ${party}`,
      `• Client language: ${clientLang}`,
      '',
      'Could you share availability, net rate or agency commission, what is included and the cancellation policy?',
      'This is not a booking yet and no payment has been made; we are quoting to answer the client.',
      '',
      'Thank you,',
      'Jose Rojas – Costa Rica Tours',
      'WhatsApp +506 8795 9148',
    ].filter(line => line !== '').join('\n');
  return { operatorId: op.operatorId, operatorName: op.name, language, subject, body, status: 'borrador_no_enviado', createdAt: now.toISOString() };
}

// ---------------------------------------------------------------------------
// Construcción del registro
// ---------------------------------------------------------------------------

function requestFrom(input: LeadInput): LeadRequest {
  const u = input.understanding?.understood;
  const base: LeadRequest = u ? {
    activity: u.activity, activityLabel: u.activityLabel, tourId: u.tourId, tourTitle: u.tourTitle,
    people: u.people, adults: u.adults, children: u.children, month: u.month, date: u.date,
    region: u.region, regionLabel: u.regionLabel, budget: u.budget,
  } : {};
  const merged: LeadRequest = { ...base };
  for (const [k, v] of Object.entries(input.request || {})) {
    if (v !== undefined && v !== null && v !== '') (merged as any)[k] = v;
  }
  return Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined)) as LeadRequest;
}

export function buildLeadRecord(input: LeadInput, now: Date = new Date()): LeadRecord {
  const at = now.toISOString();
  const language: ConciergeLanguage = input.understanding?.understood.language || (input.language === 'en' ? 'en' : 'es');
  const request = requestFrom(input);
  const consented = input.consent === true;
  const rawContact = cleanContact(input.contact);
  const contact = consented ? rawContact : null;
  const dedupeKey = computeDedupeKey({ contact: rawContact, sessionId: input.sessionId, bookingId: input.bookingId, request });
  const candidates = matchOperatorCandidates(request);
  const drafts = candidates.flatMap(op => (['es', 'en'] as const).map(lang => buildQuoteRequestDraft(op, request, language, lang, now)));
  const quote = input.referenceQuote || (input.understanding?.quote
    ? { unitPriceUSD: input.understanding.quote.unitPriceUSD, totalUSD: input.understanding.quote.totalUSD, line: input.understanding.quote.line, subjectToConfirmation: true as const }
    : undefined);
  const record: LeadRecord = {
    id: `lead_${dedupeKey.slice(0, 24)}`,
    dedupeKey,
    status: 'nuevo',
    statusHistory: [{ from: null, to: 'nuevo', at, by: `system:${input.source}` }],
    sources: [input.source],
    firstSource: input.source,
    createdAt: at,
    updatedAt: at,
    lastInquiryAt: at,
    lastActivityAt: at,
    inquiryCount: 1,
    language,
    request,
    consent: { dataProcessing: consented, law: 'Ley 8968', source: input.source, ...(consented ? { capturedAt: at } : {}) },
    contact,
    contactRedacted: !consented && Boolean(rawContact),
    operatorCandidates: candidates,
    quoteRequestDrafts: drafts,
  };
  if (quote) record.referenceQuote = quote;
  if (input.bookingId) record.bookingId = String(input.bookingId).slice(0, 80);
  if (input.bookingOutcome) record.bookingOutcome = String(input.bookingOutcome).slice(0, 80);
  if (input.message) record.messageSnippet = consented ? String(input.message).replace(/\s+/g, ' ').trim().slice(0, 280) : redactFreeText(input.message);
  return record;
}

/**
 * Solicitud de cotización desde /tour/:id → LeadInput. Requiere un payload ya
 * validado (consentimiento incluido) y el tour resuelto en el catálogo. La
 * referencia de precio solo sale de la tarifa publicada por el operador.
 */
export function buildTourPageLeadInput(payload: TourQuoteLeadPayload, tour: Tour): LeadInput {
  const people = payload.request.people;
  const date = isoDateOrUndefined(payload.request.approxDate);
  const price = publishedTourPrice(tour);
  const title = payload.language === 'en' ? (tour.title.en || tour.title.es) : tour.title.es;
  const messageParts = [
    payload.request.approxDate && !date ? `Fecha aproximada: ${payload.request.approxDate}` : '',
    payload.message || '',
  ].filter(Boolean);
  return {
    source: 'tour_page',
    language: payload.language,
    consent: payload.consent === true,
    contact: { name: payload.customer.name, email: payload.customer.email },
    request: { tourId: tour.id, tourTitle: title, region: tour.region, people, ...(date ? { date } : {}) },
    ...(messageParts.length ? { message: messageParts.join(' · ') } : {}),
    ...(price !== undefined ? {
      referenceQuote: {
        unitPriceUSD: price,
        totalUSD: price * people,
        line: `Precio de referencia: US$${price} por persona (revisado ${tour.priceCheckedAt}), sujeto a confirmación.`,
        subjectToConfirmation: true as const,
      },
    } : {}),
  };
}

/** Fusiona una consulta repetida en el lead abierto existente. */
export function mergeLead(existing: LeadRecord, incoming: LeadRecord): LeadRecord {
  const sources = Array.from(new Set([...existing.sources, ...incoming.sources])) as LeadSource[];
  const request = { ...incoming.request, ...existing.request };
  const consentGranted = existing.consent.dataProcessing || incoming.consent.dataProcessing;
  return {
    ...existing,
    sources,
    request,
    updatedAt: incoming.updatedAt,
    lastInquiryAt: incoming.lastInquiryAt,
    inquiryCount: (existing.inquiryCount || 1) + 1,
    consent: consentGranted ? (existing.consent.dataProcessing ? existing.consent : incoming.consent) : existing.consent,
    contact: existing.contact || incoming.contact,
    contactRedacted: consentGranted ? false : (existing.contactRedacted || incoming.contactRedacted),
    referenceQuote: existing.referenceQuote || incoming.referenceQuote,
    bookingId: existing.bookingId || incoming.bookingId,
    bookingOutcome: incoming.bookingOutcome || existing.bookingOutcome,
    messageSnippet: incoming.messageSnippet || existing.messageSnippet,
    operatorCandidates: existing.operatorCandidates.length ? existing.operatorCandidates : incoming.operatorCandidates,
    quoteRequestDrafts: existing.quoteRequestDrafts.length ? existing.quoteRequestDrafts : incoming.quoteRequestDrafts,
  };
}

const isTerminal = (status: LeadStatus) => status === 'pagado' || status === 'cancelado';

// ---------------------------------------------------------------------------
// Almacenamiento (Firestore `leads`, memoria si Firestore no está disponible)
// ---------------------------------------------------------------------------

const memoryLeads = new Map<string, LeadRecord>();

export function __resetLeadMemoryForTests() {
  memoryLeads.clear();
}

const stripUndefined = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export interface CaptureResult {
  lead: LeadRecord;
  created: boolean;
  storage: 'firestore' | 'memory';
}

export async function captureLead(input: LeadInput, now: Date = new Date()): Promise<CaptureResult> {
  const incoming = buildLeadRecord(input, now);
  const db = getFirestoreDb();
  const decide = (existing: LeadRecord | undefined): { lead: LeadRecord; created: boolean } => {
    if (!existing) return { lead: incoming, created: true };
    const fresh = now.getTime() - Date.parse(existing.lastInquiryAt || existing.createdAt) < DEDUPE_WINDOW_MS;
    if (!isTerminal(existing.status) && fresh) return { lead: mergeLead(existing, incoming), created: false };
    return { lead: { ...incoming, id: `${incoming.id}_${now.getTime().toString(36)}` }, created: true };
  };

  if (!db) {
    const base = memoryLeads.get(incoming.id);
    const existing = base?.reopenedAs ? memoryLeads.get(base.reopenedAs) : base;
    const result = decide(existing);
    memoryLeads.set(result.lead.id, result.lead);
    if (base && result.created && result.lead.id !== incoming.id) memoryLeads.set(incoming.id, { ...base, reopenedAs: result.lead.id });
    return { ...result, storage: 'memory' };
  }

  const result = await db.runTransaction(async (tx: any) => {
    const baseRef = db.collection('leads').doc(incoming.id);
    const baseSnap = await tx.get(baseRef);
    const base = baseSnap.exists ? (baseSnap.data() as LeadRecord) : undefined;
    let existing = base;
    if (base?.reopenedAs) {
      const reopened = await tx.get(db.collection('leads').doc(base.reopenedAs));
      existing = reopened.exists ? ({ ...(reopened.data() as LeadRecord), id: base.reopenedAs }) : undefined;
    }
    const decision = decide(existing);
    tx.set(db.collection('leads').doc(decision.lead.id), stripUndefined(decision.lead));
    if (base && decision.created && decision.lead.id !== incoming.id) tx.set(baseRef, { reopenedAs: decision.lead.id }, { merge: true });
    return decision;
  });
  return { ...result, storage: 'firestore' };
}

export async function listLeads(filter: { status?: LeadStatus; limit?: number } = {}): Promise<LeadRecord[]> {
  const limit = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
  const db = getFirestoreDb();
  let leads: LeadRecord[];
  if (!db) {
    leads = Array.from(memoryLeads.values());
  } else {
    // Sin índices compuestos: filtro por estado O orden por fecha, el resto en memoria.
    const query: any = filter.status
      ? db.collection('leads').where('status', '==', filter.status).limit(500)
      : db.collection('leads').orderBy('updatedAt', 'desc').limit(limit);
    const snap = await query.get();
    leads = snap.docs.map((doc: any) => ({ ...(doc.data() as LeadRecord), id: doc.id }));
  }
  if (filter.status) leads = leads.filter(lead => lead.status === filter.status);
  return leads.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}

export async function getLead(id: string): Promise<LeadRecord | null> {
  if (!/^lead_[a-z0-9_]{8,64}$/.test(id)) return null;
  const db = getFirestoreDb();
  if (!db) return memoryLeads.get(id) || null;
  const snap = await db.collection('leads').doc(id).get();
  return snap.exists ? ({ ...(snap.data() as LeadRecord), id }) : null;
}

export type TransitionError = 'not_found' | 'invalid_status' | 'invalid_transition' | 'evidence_required' | 'admin_required';

export async function transitionLead(
  id: string,
  to: unknown,
  actor: { by: string; role?: string | null },
  details: { note?: unknown; evidence?: unknown } = {},
  now: Date = new Date(),
): Promise<{ ok: true; lead: LeadRecord } | { ok: false; error: TransitionError; message: string }> {
  if (!isLeadStatus(to)) return { ok: false, error: 'invalid_status', message: `Estado inválido. Use: ${LEAD_STATUSES.join(', ')}` };
  const note = typeof details.note === 'string' ? details.note.trim().slice(0, 500) : undefined;
  const evidence = typeof details.evidence === 'string' ? details.evidence.trim().slice(0, 300) : undefined;
  if (EVIDENCE_REQUIRED.includes(to) && !evidence) {
    return { ok: false, error: 'evidence_required', message: `"${to}" requiere evidencia escrita (referencia del correo/WhatsApp del operador o del comprobante de pago).` };
  }
  if (ADMIN_ONLY.includes(to) && actor.role !== 'owner' && actor.role !== 'admin') {
    return { ok: false, error: 'admin_required', message: `Solo owner/admin puede marcar "${to}".` };
  }
  const apply = (lead: LeadRecord) => {
    if (!canTransition(lead.status, to)) {
      return { ok: false as const, error: 'invalid_transition' as const, message: `No se puede pasar de "${lead.status}" a "${to}".` };
    }
    const at = now.toISOString();
    const change: LeadStatusChange = { from: lead.status, to, at, by: actor.by, ...(note ? { note } : {}), ...(evidence ? { evidence } : {}) };
    return { ok: true as const, lead: { ...lead, status: to, updatedAt: at, lastActivityAt: at, statusHistory: [...(lead.statusHistory || []), change] } };
  };

  const db = getFirestoreDb();
  if (!db) {
    const lead = memoryLeads.get(id);
    if (!lead) return { ok: false, error: 'not_found', message: 'Lead no encontrado.' };
    const result = apply(lead);
    if (result.ok) memoryLeads.set(id, result.lead);
    return result;
  }
  return db.runTransaction(async (tx: any) => {
    const ref = db.collection('leads').doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false as const, error: 'not_found' as const, message: 'Lead no encontrado.' };
    const result = apply({ ...(snap.data() as LeadRecord), id });
    if (result.ok) tx.set(ref, stripUndefined(result.lead));
    return result;
  });
}

// ---------------------------------------------------------------------------
// Resumen diario
// ---------------------------------------------------------------------------

export interface LeadDigest {
  generatedAt: string;
  total: number;
  byStatus: Record<LeadStatus, number>;
  stale: Array<{ id: string; status: LeadStatus; hoursWithoutResponse: number; summary: string }>;
  text: string;
}

export function leadSummary(lead: LeadRecord): string {
  const r = lead.request;
  const what = r.tourTitle || r.activityLabel || r.regionLabel || 'consulta general';
  const when = r.date || (r.month ? MONTHS.es[r.month - 1] : 'sin fecha');
  const party = r.people ? `${r.people} pax` : 'pax ?';
  return `${what} · ${when} · ${party} · ${lead.sources.join('+')}`;
}

export function buildLeadDigest(leads: readonly LeadRecord[], now: Date = new Date()): LeadDigest {
  const byStatus = Object.fromEntries(LEAD_STATUSES.map(s => [s, 0])) as Record<LeadStatus, number>;
  for (const lead of leads) if (isLeadStatus(lead.status)) byStatus[lead.status] += 1;
  const stale = leads
    .filter(lead => OPEN_STATUSES.includes(lead.status) && now.getTime() - Date.parse(lead.lastActivityAt || lead.createdAt) > STALE_AFTER_MS)
    .map(lead => ({
      id: lead.id,
      status: lead.status,
      hoursWithoutResponse: Math.floor((now.getTime() - Date.parse(lead.lastActivityAt || lead.createdAt)) / 3_600_000),
      summary: leadSummary(lead),
    }))
    .sort((a, b) => b.hoursWithoutResponse - a.hoursWithoutResponse);
  const lines = [
    `Resumen diario de leads – ${now.toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}`,
    `Total: ${leads.length}`,
    ...LEAD_STATUSES.map(s => `• ${s}: ${byStatus[s]}`),
    stale.length ? `Sin respuesta >24h (${stale.length}):` : 'Sin leads abiertos sin respuesta >24h.',
    ...stale.slice(0, 20).map(s => `• ${s.id} [${s.status}] ${s.hoursWithoutResponse}h – ${s.summary}`),
  ];
  return { generatedAt: now.toISOString(), total: leads.length, byStatus, stale, text: lines.join('\n') };
}

// ---------------------------------------------------------------------------
// Captura segura (nunca rompe la respuesta al cliente) + aviso a Jose
// ---------------------------------------------------------------------------

/**
 * Captura un lead sin bloquear ni romper la respuesta al cliente y, si es un
 * lead nuevo, deja una alerta interna para Jose (sin datos personales).
 * LEADS_PIPELINE_ENABLED=false desactiva la captura; LEADS_NOTIFY=false el aviso.
 */
export function captureLeadInBackground(input: LeadInput): void {
  if (process.env.LEADS_PIPELINE_ENABLED === 'false') return;
  void captureLeadAndNotify(input)
    .catch(err => console.warn('[leads] captura fallida (la respuesta al cliente no se ve afectada):', err?.message || err));
}

/**
 * Igual que captureLeadInBackground pero esperando el guardado (lo usa la
 * solicitud de cotización de /tour/:id para responder solo cuando quedó
 * registrada). El aviso interno nunca rompe la respuesta.
 */
export async function captureLeadAndNotify(input: LeadInput): Promise<CaptureResult> {
  const result = await captureLead(input);
  void notifyNewLead(result).catch(err => console.warn('[leads] aviso fallido:', err?.message || err));
  return result;
}

async function notifyNewLead({ lead, created }: CaptureResult): Promise<void> {
  if (!created || process.env.LEADS_NOTIFY === 'false' || process.env.NODE_ENV === 'test') return;
  const { createAlert } = await import('./alertService');
  await createAlert({
    source: 'Pipeline de leads',
    severity: 'info',
    title: `Nuevo lead (${lead.firstSource}): ${leadSummary(lead)}`.slice(0, 140),
    message: [
      `Lead ${lead.id} en estado "nuevo".`,
      leadSummary(lead),
      lead.referenceQuote ? `Referencia: ${lead.referenceQuote.line}` : 'Sin precio de referencia.',
      `Operadores candidatos (prospectos sin contrato): ${lead.operatorCandidates.map(c => c.name).join(', ') || 'ninguno'}`,
      'Los borradores de cotización están guardados en el lead; no se envió nada a ningún operador.',
    ].join('\n'),
    metadata: { leadId: lead.id, consent: lead.consent.dataProcessing },
  });
}
