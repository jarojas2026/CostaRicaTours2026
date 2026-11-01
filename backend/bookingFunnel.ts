/**
 * Embudo de reserva guiado del asistente para clientes (sobre la memoria de conversación).
 *
 * Flujo:
 *  1. Detecta intención de reserva/cotización (es/en).
 *  2. Pide SOLO el dato que falta, de uno en uno: zona o actividad → fecha → personas → tour.
 *  3. Recomienda 2-3 tours REALES del catálogo (backend/knowledge + src/data/toursData), sin
 *     nombrar proveedores, con precio de referencia del catálogo cuando existe.
 *  4. Con todo completo llama a create_quote (existente). Si no hay cotización posible
 *     (sin oferta, sin costo contractual, margen < 20 %…) abre create_ticket para una persona.
 *
 * El modelo (Groq, openai/gpt-oss-120b con herramientas) redacta las respuestas y puede llamar a
 * save_booking_details / create_quote / create_ticket. El SERVIDOR valida cada argumento contra el
 * estado de la conversación: el modelo no puede inventar ids de tour, fechas, personas ni precios.
 * Sin modelo (o si falla) el embudo responde de forma determinista con las mismas reglas.
 *
 * Garantías de salida (guardFunnelReply): sin nombres/contactos de proveedores y sin precios que
 * no vengan del catálogo, de la cotización o del propio cliente. No cobra, no crea enlaces de pago,
 * no envía mensajes y no borra nada.
 */
import { TOURS } from '../src/data/toursData';
import { redactProviderIdentityForCustomer } from './customerOutboundPrivacy';
import { findCatalogTour } from './agentProductTools';
import { retrieveKnowledge } from './knowledge';
import {
  INTERESTS,
  ZONES,
  describeSlots,
  detectLanguage,
  interestLabels,
  todayInCostaRica,
  zoneLabel,
  type ConversationLanguage,
  type ConversationSlots,
  type ConversationState,
} from './conversationState';

export type FunnelSlot = 'zone' | 'date' | 'pax' | 'tour';

export interface FunnelRecommendation {
  id: string;
  title: string;
  /** Precio de referencia por persona del catálogo (null = requiere cotización). */
  referencePriceUSD: number | null;
  duration?: string;
}

export interface FunnelQuote {
  quoteNumber: string;
  tourId: string;
  date: string;
  pax: number;
  currency: string;
  unitPrice: number;
  totalPrice: number;
  expiresAt: string;
}

export interface FunnelState {
  active: boolean;
  recommended: FunnelRecommendation[];
  selectedTourId?: string;
  quote?: FunnelQuote;
  ticket?: { ticketNumber: string; key: string };
  lastAsked?: FunnelSlot | 'done';
}

export const FUNNEL_TOOL_NAMES = ['save_booking_details', 'create_quote', 'create_ticket'] as const;
const MAX_ROUNDS = 3;
const MAX_RECOMMENDATIONS = 3;

// ---------------------------------------------------------------------------
// Intención y estado
// ---------------------------------------------------------------------------

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const BOOKING_INTENT = /\b(reserv\w*|book(ing|ed)?|cotiz\w*|quote|presupuesto para|disponibilidad|availability|available|quiero (ir|hacer|tomar|contratar|un tour)|queremos (ir|hacer|tomar|un tour)|quisiera(mos)? (ir|hacer|reservar)|we (want|would like|'d like) to (go|do|book|take)|i (want|would like|'d like) to (go|do|book|take)|how much (for|is|would)|cuanto (cuesta|sale|seria|vale)|precio (para|de)|apart\w*)\b/;
const FUNNEL_EXIT = /\b(cancela(r)? (la )?(reserva|cotizacion)|olvidalo|ya no (quiero|queremos)|no gracias|never ?mind|forget it|no thanks|stop)\b/;

export function detectBookingIntent(text: string): boolean {
  return BOOKING_INTENT.test(norm(text));
}

export function getFunnel(state: ConversationState): FunnelState {
  const raw: any = state.extra?.funnel;
  if (!raw || typeof raw !== 'object') return { active: false, recommended: [] };
  return {
    active: raw.active === true,
    recommended: Array.isArray(raw.recommended) ? raw.recommended.slice(0, MAX_RECOMMENDATIONS) : [],
    ...(typeof raw.selectedTourId === 'string' ? { selectedTourId: raw.selectedTourId } : {}),
    ...(raw.quote && typeof raw.quote === 'object' ? { quote: raw.quote } : {}),
    ...(raw.ticket && typeof raw.ticket === 'object' ? { ticket: raw.ticket } : {}),
    ...(raw.lastAsked ? { lastAsked: raw.lastAsked } : {}),
  };
}

export function withFunnel(state: ConversationState, funnel: FunnelState): ConversationState {
  return { ...state, extra: { ...(state.extra || {}), funnel: JSON.parse(JSON.stringify(funnel)) } };
}

/** ¿Este turno lo atiende el embudo? (intención nueva o embudo activo sin pedido de salida). */
export function shouldRunFunnel(state: ConversationState, message: string): boolean {
  if (FUNNEL_EXIT.test(norm(message))) return false;
  return getFunnel(state).active || detectBookingIntent(message);
}

/** Siguiente dato que falta, en orden fijo. null = listo para cotizar. */
export function nextMissingSlot(slots: ConversationSlots, funnel: FunnelState): FunnelSlot | null {
  if (!slots.zone && !(slots.interests && slots.interests.length) && !funnel.selectedTourId) return 'zone';
  if (!slots.date) return 'date';
  if (!slots.pax) return 'pax';
  if (!funnel.selectedTourId) return 'tour';
  return null;
}

// ---------------------------------------------------------------------------
// Recomendaciones reales del catálogo (sin proveedores)
// ---------------------------------------------------------------------------

const customerTitle = (t: any, lang: ConversationLanguage) => redactProviderIdentityForCustomer(
  String(t?.title?.[lang] || t?.title?.es || t?.id || ''),
  { language: lang, providerNames: [t?.operatorName, t?.providerId, t?.operatorId].filter((n: unknown): n is string => typeof n === 'string' && n.length >= 3) },
);

function toRecommendation(t: any, lang: ConversationLanguage): FunnelRecommendation {
  return {
    id: String(t.id),
    title: customerTitle(t, lang),
    referencePriceUSD: Number(t.priceUSD) > 0 ? Number(t.priceUSD) : null,
    ...(t.durationLabel?.[lang] ? { duration: String(t.durationLabel[lang]) } : {}),
  };
}

/** 2-3 tours del catálogo para la zona/intereses/personas/presupuesto. Nunca inventa. */
export function recommendTours(slots: ConversationSlots, lang: ConversationLanguage, catalog: any[] = TOURS as any[]): FunnelRecommendation[] {
  const zone = ZONES.find(z => z.key === slots.zone);
  const interests = slots.interests || [];
  // Traslados y servicios no son tours: solo si el cliente no busca una actividad.
  let pool = catalog.filter(t => t && t.isDemoData !== true && String(t.category) !== 'services' && (!zone || zone.regions.includes(String(t.region))));
  const byInterest = interests.length ? pool.filter(t => interests.includes(String(t.category))) : [];
  if (byInterest.length) pool = byInterest;
  if (slots.pax) pool = pool.filter(t => !(Number(t.maxGroupSize) > 0) || Number(t.maxGroupSize) >= slots.pax!);
  if (slots.children) pool = pool.filter(t => !(Number(t.ageMinimum) >= 12));
  if (!pool.length) return [];

  // Orden: relevancia BM25 de la base de conocimiento (intereses + zona), luego valoración.
  const rank = new Map<string, number>();
  const query = [zone?.label.es, zone?.label.en, ...interestLabels(interests, 'es'), ...interestLabels(interests, 'en')].filter(Boolean).join(' ');
  if (query) {
    try {
      retrieveKnowledge(query, { limit: 10, maxTours: 10, minScore: 0 })
        .filter(s => s.kind === 'tour')
        .forEach((s, i) => rank.set(s.id.replace(/^tour:/, ''), 100 - i));
    } catch { /* sin índice: solo valoración */ }
  }
  const budgetPP = slots.budget?.currency === 'USD'
    ? (slots.budget.per === 'total' && slots.pax ? slots.budget.amount / slots.pax : slots.budget.amount)
    : undefined;
  const score = (t: any) => (rank.get(String(t.id)) ?? 0)
    + (Number(t.rating) || 0)
    + (budgetPP && Number(t.priceUSD) > 0 && Number(t.priceUSD) <= budgetPP ? 50 : 0)
    + (Number(t.priceUSD) > 0 ? 1 : 0);
  return [...pool].sort((a, b) => score(b) - score(a)).slice(0, MAX_RECOMMENDATIONS).map(t => toRecommendation(t, lang));
}

/** Elección del cliente: "2", "la segunda", "second", "opción 1" o palabras del título. */
export function parseTourChoice(message: string, recommended: FunnelRecommendation[]): string | undefined {
  if (!recommended.length) return undefined;
  const t = norm(message).trim();
  const ordinals: Array<[RegExp, number]> = [
    [/\b(primer[oa]?|first|1st)\b|^(la |el )?(uno|una|one)$/, 0], [/\b(segund[oa]|second|2nd)\b|^(la |el )?(dos|two)$/, 1], [/\b(tercer[oa]?|third|3rd)\b|^(la |el )?(tres|three)$/, 2],
  ];
  const num = t.match(/^(?:la |el |opcion |option |#|numero |number )?([1-3])\b(?![\d/.:-])/) || t.match(/\b(?:opcion|option|numero|number|#)\s*([1-3])\b/);
  if (num) return recommended[Number(num[1]) - 1]?.id;
  if (t.split(/\s+/).length <= 4) {
    for (const [re, idx] of ordinals) if (re.test(t) && recommended[idx]) return recommended[idx].id;
  }
  const byId = recommended.find(r => t.includes(norm(r.id)));
  if (byId) return byId.id;
  const words = (s: string) => new Set(norm(s).split(/[^a-z0-9]+/).filter(w => w.length >= 4));
  const msg = words(message);
  let best: { id: string; hits: number } | undefined;
  for (const r of recommended) {
    const hits = [...words(r.title)].filter(w => msg.has(w)).length;
    if (hits >= 2 && (!best || hits > best.hits)) best = { id: r.id, hits };
  }
  return best?.id;
}

// ---------------------------------------------------------------------------
// Validación de argumentos del modelo
// ---------------------------------------------------------------------------

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validDate(value: unknown, now: Date): string | undefined {
  const s = String(value ?? '').trim();
  if (!ISO.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))) return undefined;
  const today = todayInCostaRica(now);
  const max = new Date(Date.parse(`${today}T00:00:00Z`) + 730 * 86_400_000).toISOString().slice(0, 10);
  return s >= today && s <= max && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s ? s : undefined;
}

const intIn = (v: unknown, min: number, max: number) => {
  const n = typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v) : v;
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max ? n : undefined;
};

/** Aplica save_booking_details validando cada campo. Devuelve lo guardado y lo rechazado. */
export function applyBookingDetails(state: ConversationState, args: Record<string, unknown>, now: Date) {
  const slots: ConversationSlots = { ...state.slots };
  let funnel = getFunnel(state);
  const saved: string[] = [];
  const rejected: string[] = [];
  const a = args && typeof args === 'object' ? args : {};
  if (a.date !== undefined) { const d = validDate(a.date, now); if (d) { slots.date = d; delete slots.dateRange; saved.push('date'); } else rejected.push('date'); }
  const adults = a.adults !== undefined ? intIn(a.adults, 0, 50) : undefined;
  const children = a.children !== undefined ? intIn(a.children, 0, 50) : undefined;
  if (a.adults !== undefined && adults === undefined) rejected.push('adults');
  if (a.children !== undefined && children === undefined) rejected.push('children');
  if (adults !== undefined || children !== undefined) {
    const total = (adults ?? 0) + (children ?? 0);
    if (total >= 1 && total <= 50) { slots.adults = adults ?? 0; slots.children = children ?? 0; slots.pax = total; saved.push('pax'); }
  } else if (a.pax !== undefined) {
    const pax = intIn(a.pax, 1, 50);
    if (pax) { slots.pax = pax; delete slots.adults; delete slots.children; saved.push('pax'); } else rejected.push('pax');
  }
  if (a.zone !== undefined) {
    const z = ZONES.find(x => x.key === String(a.zone) || norm(x.label.es) === norm(String(a.zone)) || x.pattern.test(norm(String(a.zone))));
    if (z) { slots.zone = z.key; saved.push('zone'); } else rejected.push('zone');
  }
  if (a.interests !== undefined) {
    const list = (Array.isArray(a.interests) ? a.interests : [a.interests]).map(x => String(x));
    const keys = list.map(x => INTERESTS.find(i => i.key === x || i.pattern.test(norm(x)))?.key).filter((k): k is string => Boolean(k));
    if (keys.length) { slots.interests = [...new Set([...(slots.interests || []), ...keys])].slice(-6); saved.push('interests'); } else rejected.push('interests');
  }
  if (a.language === 'es' || a.language === 'en') { slots.language = a.language; saved.push('language'); }
  if (a.tourId !== undefined) {
    const id = String(a.tourId);
    const rec = funnel.recommended.find(r => r.id === id);
    const cat = rec ? undefined : findCatalogTour(id);
    if (rec || (cat && (cat as any).isDemoData !== true)) {
      funnel = { ...funnel, selectedTourId: rec ? rec.id : String(cat!.id) };
      saved.push('tourId');
    } else rejected.push('tourId');
  }
  return { state: withFunnel({ ...state, slots }, funnel), saved, rejected };
}

// ---------------------------------------------------------------------------
// Cotización y tiquete (servicios existentes, inyectables)
// ---------------------------------------------------------------------------

export interface FunnelToolDeps {
  createQuote?: (input: Record<string, unknown>, ctx: Record<string, unknown>) => Promise<any>;
  createTicket?: (input: Record<string, unknown>, ctx: Record<string, unknown>) => Promise<any>;
}

const QUOTE_UNAVAILABLE = new Set(['price_not_available', 'supplier_cost_unavailable', 'margin_below_minimum', 'tour_not_found', 'invalid_pax', 'date_out_of_range']);

async function realCreateQuote(input: Record<string, unknown>, ctx: Record<string, unknown>) {
  const { createQuote } = await import('./agentQuote');
  return createQuote(input as any, ctx as any);
}
async function realCreateTicket(input: Record<string, unknown>, ctx: Record<string, unknown>) {
  const { createTicket } = await import('./agentSupportTicket');
  return createTicket(input as any, ctx as any);
}

/** Lista blanca de la cotización: nunca proveedor, costo, comisión ni margen. */
function whitelistQuote(r: any): FunnelQuote | null {
  if (!r || r.success !== true || typeof r.quoteNumber !== 'string') return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(2)) : NaN);
  const q: FunnelQuote = {
    quoteNumber: String(r.quoteNumber).slice(0, 40),
    tourId: String(r.tourId || ''),
    date: String(r.date || ''),
    pax: Number(r.pax),
    currency: String(r.currency || 'USD'),
    unitPrice: num(r.unitPrice),
    totalPrice: num(r.totalPrice),
    expiresAt: String(r.expiresAt || ''),
  };
  return Number.isFinite(q.totalPrice) && Number.isFinite(q.unitPrice) ? q : null;
}

const tupleKey = (tourId: string, date: string, pax: number) => `${tourId}|${date}|${pax}`;

/** create_quote validado: usa SIEMPRE los datos del estado (no los del modelo) y abre tiquete si no hay precio. */
export async function runQuoteStep(state: ConversationState, ctx: { sessionId?: string; language: ConversationLanguage }, deps: FunnelToolDeps = {}) {
  const funnel = getFunnel(state);
  const missing = nextMissingSlot(state.slots, funnel);
  if (missing) return { state, result: { success: false, error: 'missing_details', missing } };
  const tourId = funnel.selectedTourId!;
  const date = state.slots.date!;
  const pax = state.slots.pax!;
  const key = tupleKey(tourId, date, pax);
  if (funnel.quote && tupleKey(funnel.quote.tourId, funnel.quote.date, funnel.quote.pax) === key) {
    return { state, result: { success: true, quote: funnel.quote, reused: true } };
  }
  if (funnel.ticket?.key === key) return { state, result: { success: false, quoteAvailable: false, ticketNumber: funnel.ticket.ticketNumber, reused: true } };

  const toolCtx = { sessionId: ctx.sessionId, channel: 'chat', language: ctx.language };
  let raw: any;
  try { raw = await (deps.createQuote ?? realCreateQuote)({ tourId, date, pax, currency: 'USD' }, toolCtx); } catch { raw = { success: false, error: 'quote_failed' }; }
  const quote = whitelistQuote(raw);
  if (quote) {
    return { state: withFunnel(state, { ...funnel, quote, lastAsked: 'done' }), result: { success: true, quote } };
  }
  const error = String(raw?.error || 'quote_failed').slice(0, 60);
  if (raw?.next === 'create_ticket' || QUOTE_UNAVAILABLE.has(error)) {
    let t: any;
    try {
      t = await (deps.createTicket ?? realCreateTicket)({
        reason: 'unresolved_question',
        priority: 'normal',
        summary: `Cotización no disponible desde el chat (${error}) para el tour ${tourId}, ${pax} pax, ${date.slice(0, 7)}.`,
        data: { tourId, topic: 'quote_unavailable', travelDate: date.slice(0, 7).replace('-', ''), count: pax },
      }, toolCtx);
    } catch { t = null; }
    if (t?.success === true && typeof t.ticketNumber === 'string') {
      const ticket = { ticketNumber: String(t.ticketNumber).slice(0, 40), key };
      return { state: withFunnel(state, { ...funnel, ticket, lastAsked: 'done' }), result: { success: false, quoteAvailable: false, ticketNumber: ticket.ticketNumber } };
    }
    return { state, result: { success: false, quoteAvailable: false, error: 'ticket_unavailable' } };
  }
  return { state, result: { success: false, error } };
}

/** create_ticket pedido por el modelo: uno por sesión del embudo; el servicio sanea el resumen. */
async function runTicketTool(state: ConversationState, args: Record<string, unknown>, ctx: { sessionId?: string; language: ConversationLanguage }, deps: FunnelToolDeps) {
  const funnel = getFunnel(state);
  if (funnel.ticket) return { state, result: { success: true, ticketNumber: funnel.ticket.ticketNumber, reused: true } };
  let t: any;
  try {
    t = await (deps.createTicket ?? realCreateTicket)({
      reason: args.reason, priority: args.priority ?? 'normal', summary: args.summary,
      data: { topic: 'chat_funnel', ...(funnel.selectedTourId ? { tourId: funnel.selectedTourId } : {}) },
    }, { sessionId: ctx.sessionId, channel: 'chat', language: ctx.language });
  } catch { t = null; }
  if (t?.success === true && typeof t.ticketNumber === 'string') {
    const ticket = { ticketNumber: String(t.ticketNumber).slice(0, 40), key: 'manual' };
    return { state: withFunnel(state, { ...funnel, ticket }), result: { success: true, ticketNumber: ticket.ticketNumber } };
  }
  return { state, result: { success: false, error: String(t?.error || 'ticket_unavailable').slice(0, 60) } };
}

// ---------------------------------------------------------------------------
// Salida segura
// ---------------------------------------------------------------------------

const PRICE_TOKEN = /(?:US\$|USD|\$|₡|CRC)\s?\d[\d.,]*|\d[\d.,]*\s?(?:USD|US\$|d[oó]lares|dollars|colones|CRC)\b/gi;
/** Mismo patrón de precios que usa la barrera de salida (para la evaluación offline). */
export const PRICE_TOKEN_FOR_EVAL = PRICE_TOKEN;
const LEGAL_ENTITY = /\b(?:[A-ZÁÉÍÓÚÑ][\p{L}&'.-]*\s+){1,5}(?:S\.\s?A\.|S\.\s?R\.\s?L\.|SRL|Ltda\.?|LLC|Inc\.)/gu;

const amountOf = (token: string) => {
  const digits = (token.match(/\d[\d.,]*/) || [''])[0].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.');
  const n = Number(digits);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : NaN;
};

/** Montos permitidos: los que aparecen como precio en los textos de anclaje (catálogo, cotización, cliente). */
export function allowedAmounts(groundTexts: string[]): Set<number> {
  const out = new Set<number>();
  for (const text of groundTexts) {
    for (const tok of String(text || '').match(PRICE_TOKEN) || []) { const n = amountOf(tok); if (Number.isFinite(n)) out.add(n); }
  }
  return out;
}

/**
 * Última barrera antes del cliente: quita identidad/contactos de proveedores (denylist + entidades
 * legales tipo "X S.A.") y reemplaza todo precio que no esté anclado en datos verificados.
 */
export function guardFunnelReply(reply: string, groundTexts: string[], lang: ConversationLanguage, providerNames: string[] = []) {
  const placeholder = lang === 'en' ? 'our local operator' : 'nuestro operador local';
  let out = redactProviderIdentityForCustomer(String(reply || ''), { language: lang, providerNames });
  let supplierRedactions = 0;
  out = out.replace(LEGAL_ENTITY, () => { supplierRedactions++; return placeholder; });
  const allowed = allowedAmounts(groundTexts);
  let removedPrices = 0;
  out = out.replace(PRICE_TOKEN, (tok) => {
    if (allowed.has(amountOf(tok))) return tok;
    removedPrices++;
    return lang === 'en' ? '(price to be confirmed)' : '(precio por confirmar)';
  });
  return { reply: out, removedPrices, supplierRedactions };
}

// ---------------------------------------------------------------------------
// Respuestas deterministas (sin modelo)
// ---------------------------------------------------------------------------

function formatRecommendations(recs: FunnelRecommendation[], lang: ConversationLanguage): string {
  return recs.map((r, i) => {
    const price = r.referencePriceUSD !== null
      ? (lang === 'en' ? ` — reference price USD ${r.referencePriceUSD} per person (subject to confirmation)` : ` — precio de referencia USD ${r.referencePriceUSD} por persona (sujeto a confirmación)`)
      : (lang === 'en' ? ' — price on request' : ' — precio a cotizar');
    return `${i + 1}. ${r.title}${r.duration ? ` (${r.duration})` : ''}${price}`;
  }).join('\n');
}

export function questionFor(slot: FunnelSlot, state: ConversationState, lang: ConversationLanguage): string {
  const en = lang === 'en';
  const funnel = getFunnel(state);
  switch (slot) {
    case 'zone':
      return en ? 'Which area of Costa Rica would you like, or what activity interests you (for example rafting, ziplining, volcanoes or wildlife)?'
        : '¿En qué zona de Costa Rica te gustaría, o qué actividad te interesa (por ejemplo rafting, canopy, volcanes o fauna)?';
    case 'date':
      return en ? 'What date would you like to go? (for example December 15)' : '¿Para qué fecha sería? (por ejemplo, 15 de diciembre)';
    case 'pax':
      return en ? 'How many people are traveling (and how many of them are children)?' : '¿Cuántas personas viajan (y cuántas son niños)?';
    case 'tour': {
      if (!funnel.recommended.length) {
        return en ? 'I could not find a tour in our catalog for that area and activity. Would you like to try another area or activity?'
          : 'No encontré un tour en nuestro catálogo para esa zona y actividad. ¿Quieres probar con otra zona o actividad?';
      }
      const where = zoneLabel(state.slots.zone, lang);
      return `${en ? `Here are some options${where ? ` in ${where}` : ''}:` : `Te recomiendo estas opciones${where ? ` en ${where}` : ''}:`}\n${formatRecommendations(funnel.recommended, lang)}\n${en ? 'Which one do you prefer? Reply with the number.' : '¿Cuál prefieres? Responde con el número.'}`;
    }
  }
}

function deterministicReply(state: ConversationState, lang: ConversationLanguage, quoteResult: any | null): string {
  const en = lang === 'en';
  const funnel = getFunnel(state);
  if (quoteResult?.success && quoteResult.quote) {
    const q: FunnelQuote = quoteResult.quote;
    const title = funnel.recommended.find(r => r.id === q.tourId)?.title || customerTitle(findCatalogTour(q.tourId), lang) || q.tourId;
    return en
      ? `Done: quote ${q.quoteNumber} for "${title}", ${q.date}, ${q.pax} ${q.pax === 1 ? 'person' : 'people'}: total ${q.currency} ${q.totalPrice} (${q.currency} ${q.unitPrice} per person). Valid for 48 hours. Availability is confirmed with our local operator before any payment; nothing has been charged.`
      : `Listo: cotización ${q.quoteNumber} para "${title}", ${q.date}, ${q.pax} ${q.pax === 1 ? 'persona' : 'personas'}: total ${q.currency} ${q.totalPrice} (${q.currency} ${q.unitPrice} por persona). Válida por 48 horas. La disponibilidad se confirma con nuestro operador local antes de cualquier pago; no se ha cobrado nada.`;
  }
  if (quoteResult && quoteResult.ticketNumber) {
    return en
      ? `I don't have a confirmed price for that tour right now, so I opened request ${quoteResult.ticketNumber} for our team to quote it for you. Nothing has been charged.`
      : `Ahora no tengo un precio confirmado para ese tour, así que abrí la solicitud ${quoteResult.ticketNumber} para que nuestro equipo te lo cotice. No se ha cobrado nada.`;
  }
  if (quoteResult && !quoteResult.success && !quoteResult.missing) {
    return en
      ? 'I could not create the quote right now. You can use "Request a quote" on the tour page and our team will follow up.'
      : 'No pude generar la cotización en este momento. Puedes usar "Consultar disponibilidad" en la ficha del tour y nuestro equipo te dará seguimiento.';
  }
  const missing = nextMissingSlot(state.slots, funnel);
  const prefs = describeSlots({ ...state.slots, language: undefined }, lang);
  const ack = prefs ? `${en ? 'Noted' : 'Anotado'} — ${prefs}.\n` : '';
  return `${ack}${questionFor(missing || 'tour', state, lang)}`;
}

// ---------------------------------------------------------------------------
// Turno del embudo (modelo con herramientas + respaldo determinista)
// ---------------------------------------------------------------------------

export type FunnelChat = (params: { messages: any[]; tools?: any[] }) => Promise<any>;

export interface FunnelTurnDeps extends FunnelToolDeps {
  /** Cliente del modelo (Groq OpenAI-compatible). Sin él, respuesta determinista. */
  chat?: FunnelChat;
  now?: () => Date;
  catalog?: any[];
  /** Nombres extra de proveedores a ocultar (además del denylist interno). */
  providerNames?: string[];
}

export const FUNNEL_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'save_booking_details',
      description: 'Save booking details the customer just gave. Only include fields the customer stated. The server validates every field.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Tour date YYYY-MM-DD (Costa Rica time, today or later)' },
          adults: { type: 'integer', minimum: 0, maximum: 50 },
          children: { type: 'integer', minimum: 0, maximum: 50 },
          pax: { type: 'integer', minimum: 1, maximum: 50, description: 'Total travelers when adults/children are not given' },
          zone: { type: 'string', enum: ZONES.map(z => z.key) },
          interests: { type: 'array', items: { type: 'string', enum: INTERESTS.map(i => i.key) } },
          tourId: { type: 'string', description: 'Id of the tour the customer chose (must be one of the recommended ids)' },
          language: { type: 'string', enum: ['es', 'en'] },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_quote',
      description: 'Create the formal quote once tour, date and travelers are saved. Uses the saved details; never invent a price. If no quote is possible the server opens a ticket for a human automatically.',
      parameters: { type: 'object', properties: { tourId: { type: 'string' } } },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_ticket',
      description: 'Escalate to a human teammate (complaint, special request, something you cannot resolve). Summary must not contain names, emails or phone numbers.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', enum: ['unresolved_question', 'booking_issue', 'special_request', 'complaint', 'human_requested', 'other'] },
          summary: { type: 'string', maxLength: 200 },
          priority: { type: 'string', enum: ['low', 'normal', 'high'] },
        },
        required: ['reason', 'summary'],
      },
    },
  },
];

export function buildFunnelSystemPrompt(state: ConversationState, lang: ConversationLanguage): string {
  const en = lang === 'en';
  const funnel = getFunnel(state);
  const missing = nextMissingSlot(state.slots, funnel);
  const prefs = describeSlots({ ...state.slots, language: undefined }, 'en') || 'none yet';
  const recs = funnel.recommended.length ? formatRecommendations(funnel.recommended, lang) : '';
  return [
    en ? 'You are the booking assistant of Costa Rica Tours. Reply ONLY in English.' : 'Eres el asistente de reservas de Costa Rica Tours. Responde SOLO en español.',
    'Be warm and brief (max ~90 words). Follow the booking steps strictly.',
    `Saved booking details: ${prefs}.${funnel.selectedTourId ? ` Chosen tour id: ${funnel.selectedTourId}.` : ''}`,
    missing
      ? `Missing next: ${missing}. Ask ONLY for this one item (one question). Do not ask for anything already saved. Do not ask for names, emails or phone numbers.`
      : funnel.quote
        ? `The quote is already created: ${JSON.stringify(funnel.quote)}. Present it (number, total, per person, valid 48 hours, availability confirmed before any payment, nothing charged). Do not call create_quote again.`
        : funnel.ticket
          ? `No quote was possible; a human will quote it. Share request number ${funnel.ticket.ticketNumber}. Nothing was charged.`
          : 'All details are saved: call create_quote now (do not ask anything else first).',
    recs ? `Recommended tours (real catalog; show these, numbered, and let the customer choose; the ids are ${funnel.recommended.map(r => r.id).join(', ')}):\n${recs}` : '',
    'When the customer gives a detail the server did not capture (e.g. "next Friday", "three of us", "the first one"), call save_booking_details with it.',
    'RULES: Never invent tours, prices, availability or schedules. Only mention prices that appear in the recommended list or in a create_quote result, always as reference/subject to confirmation. Never name operators/suppliers or give their phone, email, website or address; say "our local operator". Never say a booking or payment is confirmed: a quote is not a booking and nothing is charged. Never ask for card numbers.',
    'If create_quote returns quoteAvailable:false with a ticketNumber, tell the customer our team will quote it and share the ticket number.',
  ].filter(Boolean).join('\n');
}

function groundTextsFor(state: ConversationState, extra: string[] = []): string[] {
  const funnel = getFunnel(state);
  const texts = [formatRecommendations(funnel.recommended, 'es'), formatRecommendations(funnel.recommended, 'en'), ...extra];
  if (funnel.quote) texts.push(`USD ${funnel.quote.totalPrice} USD ${funnel.quote.unitPrice}`);
  if (state.slots.budget) texts.push(`${state.slots.budget.currency === 'CRC' ? '₡' : 'USD '}${state.slots.budget.amount}`);
  return texts;
}

/** Recalcula recomendaciones cuando corresponde y aplica la elección del cliente. */
export function prepareFunnelState(state: ConversationState, message: string, lang: ConversationLanguage, catalog?: any[]): ConversationState {
  let funnel: FunnelState = { ...getFunnel(state), active: true };
  // Elección por número/título entre las recomendadas que ya vio el cliente.
  if (!funnel.selectedTourId || funnel.lastAsked === 'tour') {
    const choice = parseTourChoice(message, funnel.recommended);
    if (choice) funnel = { ...funnel, selectedTourId: choice };
  }
  const missing = nextMissingSlot(state.slots, funnel);
  if (missing === 'tour') {
    const recs = recommendTours(state.slots, lang, catalog);
    const sameSet = recs.map(r => r.id).join() === funnel.recommended.map(r => r.id).join();
    funnel = { ...funnel, recommended: sameSet ? funnel.recommended : recs };
  }
  return withFunnel(state, funnel);
}

export interface FunnelTurnResult {
  reply: string;
  state: ConversationState;
  modelUsed: string;
  quickActions: Array<{ label: string; action: string; data?: any }>;
  toolCalls: Array<{ name: string; ok: boolean }>;
  guard: { removedPrices: number; supplierRedactions: number };
}

/** Un turno del embudo. Nunca lanza. */
export async function runFunnelTurn(params: {
  message: string;
  language: ConversationLanguage;
  state: ConversationState;
  sessionId?: string;
}, deps: FunnelTurnDeps = {}): Promise<FunnelTurnResult> {
  const now = (deps.now ?? (() => new Date()))();
  const lang: ConversationLanguage = params.state.slots.language || params.language;
  let state = prepareFunnelState(params.state, params.message, lang, deps.catalog);
  const ctx = { sessionId: params.sessionId, language: lang };
  const toolCalls: Array<{ name: string; ok: boolean }> = [];
  const toolTexts: string[] = [];
  let quoteResult: any = null;

  // Con todo completo, el servidor cotiza sin esperar al modelo (datos validados del estado).
  if (!nextMissingSlot(state.slots, getFunnel(state))) {
    const step = await runQuoteStep(state, ctx, deps);
    state = step.state;
    quoteResult = step.result;
    toolCalls.push({ name: 'create_quote', ok: Boolean(step.result.success) });
    toolTexts.push(JSON.stringify(step.result));
  }

  let reply = '';
  let modelUsed = 'booking_funnel';
  if (deps.chat) {
    try {
      const messages: any[] = [{ role: 'system', content: buildFunnelSystemPrompt(state, lang) }];
      for (const t of params.state.turns.slice(-6, -1)) messages.push({ role: t.role, content: t.text });
      const serverNote = quoteResult ? `\n\n[SERVER create_quote result: ${JSON.stringify(quoteResult)}]` : '';
      messages.push({ role: 'user', content: `${params.message}${serverNote}` });
      for (let round = 0; round <= MAX_ROUNDS; round++) {
        const response = await deps.chat({ messages, tools: round < MAX_ROUNDS ? FUNNEL_TOOLS : undefined });
        modelUsed = String(response?.model || modelUsed);
        const msg = response?.choices?.[0]?.message || {};
        const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls.slice(0, 3) : [];
        if (!calls.length) { reply = String(msg.content || '').trim(); break; }
        messages.push({ role: 'assistant', content: msg.content ?? null, tool_calls: calls });
        for (const call of calls) {
          const name = String(call?.function?.name || '');
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(String(call?.function?.arguments || '{}') || '{}'); } catch { args = {}; }
          let result: any;
          if (name === 'save_booking_details') {
            const applied = applyBookingDetails(state, args, now);
            state = prepareFunnelState(applied.state, '', lang, deps.catalog);
            const f = getFunnel(state);
            result = { saved: applied.saved, rejected: applied.rejected, missing: nextMissingSlot(state.slots, f), recommended: f.recommended };
            // El prompt del sistema refleja siempre el estado validado más reciente.
            messages[0] = { role: 'system', content: buildFunnelSystemPrompt(state, lang) };
          } else if (name === 'create_quote') {
            if (typeof args.tourId === 'string' && args.tourId) {
              const applied = applyBookingDetails(state, { tourId: args.tourId }, now);
              if (applied.saved.includes('tourId')) state = applied.state;
            }
            const step = await runQuoteStep(state, ctx, deps);
            state = step.state;
            result = step.result;
            quoteResult = step.result.missing ? quoteResult : step.result;
          } else if (name === 'create_ticket') {
            const step = await runTicketTool(state, args, ctx, deps);
            state = step.state;
            result = step.result;
          } else {
            result = { error: 'tool_not_allowed' };
          }
          toolCalls.push({ name, ok: !result?.error && result?.success !== false });
          const content = JSON.stringify(result).slice(0, 2000);
          toolTexts.push(content);
          messages.push({ role: 'tool', tool_call_id: String(call?.id || name), content });
        }
      }
    } catch {
      reply = '';
    }
  }
  // Idioma: si el modelo contestó en otro idioma, se usa la respuesta determinista en el del cliente.
  const replyLang = reply ? detectLanguage(reply) : undefined;
  if (!reply || (replyLang && replyLang !== lang)) { reply = deterministicReply(state, lang, quoteResult); modelUsed = 'booking_funnel'; }

  const guard = guardFunnelReply(reply, groundTextsFor(state, toolTexts), lang, deps.providerNames);
  const funnel = getFunnel(state);
  const missing = nextMissingSlot(state.slots, funnel);
  state = withFunnel(state, { ...funnel, lastAsked: missing ?? 'done', active: !(funnel.quote || funnel.ticket) || Boolean(missing) });

  const quickActions: Array<{ label: string; action: string; data?: any }> = [];
  if (missing === 'tour') getFunnel(state).recommended.forEach((r, i) => quickActions.push({ label: `${i + 1}. ${r.title}`.slice(0, 60), action: 'send_message', data: { message: String(i + 1) } }));
  if (funnel.quote) quickActions.push({ label: lang === 'en' ? '💬 Talk to our team' : '💬 Hablar con el equipo', action: 'direct_whatsapp' });
  return { reply: guard.reply, state, modelUsed, quickActions, toolCalls, guard: { removedPrices: guard.removedPrices, supplierRedactions: guard.supplierRedactions } };
}

/**
 * Cliente del modelo para el embudo: Groq (OpenAI-compatible) a través de callProvider (breaker,
 * observaciones de salud y respaldo GROQ_MODEL_FALLBACK). undefined si no está configurado ⇒
 * respuestas deterministas. PII redactada salvo que la configuración lo permita.
 */
export async function defaultFunnelChat(): Promise<FunnelChat | undefined> {
  try {
    const { providerOrder, getAiConfig } = await import('./aiConfig');
    if (!providerOrder().includes('openai_compat')) return undefined;
    const { callProvider, redactPii } = await import('./aiRouter');
    const { openAiCompatChat } = await import('./openaiCompatClient');
    const allowPii = getAiConfig().allowExternalPii;
    return ({ messages, tools }) => callProvider('openai_compat', 'concierge', signal => openAiCompatChat({
      messages: allowPii ? messages : messages.map((m: any) => (typeof m.content === 'string' ? { ...m, content: redactPii(m.content) } : m)),
      tools,
      signal,
    }));
  } catch {
    return undefined;
  }
}
