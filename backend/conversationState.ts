/**
 * Memoria de conversación del asistente para clientes (solo servidor, $0).
 *
 * Qué guarda, por sesión de chat verificada:
 *  - Preferencias recogidas (slots): fechas, personas (adultos/niños), zona, intereses,
 *    presupuesto e idioma. Se extraen de forma DETERMINISTA (sin llamadas extra al modelo).
 *  - Los últimos turnos (cortos y sin datos personales) y un resumen compacto de los turnos
 *    más viejos, para no superar el límite gratuito de Groq (8K tokens por minuto).
 *
 * Privacidad (Ley 8968 / PRODHAB), mismo criterio que log_event (agentEventLog.ts):
 *  - El id del documento es el hash SHA-256 truncado de la sesión (hashIdentifier); la sesión
 *    en claro nunca se guarda.
 *  - El texto de los turnos pasa por redactPii + filtro de correos, URLs, 7+ dígitos y nombres
 *    presentados ("me llamo…", "my name is…"). Nunca se guardan nombres, correos ni teléfonos.
 *  - `expiresAt` (7 días desde la última actividad) permite una política TTL de Firestore; mientras
 *    no exista, la lectura ignora los documentos vencidos.
 *
 * Almacenamiento: colección privada de servidor `agent_conversation_state` (Admin SDK; las
 * reglas cliente caen en el Default Deny). Sin Firestore (tests, local) usa un mapa en memoria
 * acotado. Nunca lanza hacia el chat: ante cualquier fallo el asistente sigue sin memoria.
 * No cobra, no envía nada y no borra nada.
 */
import { hashIdentifier } from './agentEventLog';
import { redactPii } from './aiRouter';

export const CONVERSATION_STATE_COLLECTION = 'agent_conversation_state';
export const CONVERSATION_STATE_TTL_DAYS = 7;
/** Turnos recientes que se conservan literales (ya saneados). */
export const CONVERSATION_RECENT_TURNS = 8;
export const CONVERSATION_TURN_MAX_CHARS = 500;
export const CONVERSATION_SUMMARY_MAX_CHARS = 600;
/** Bloque de memoria que se inyecta al modelo (≈ 250 tokens). */
export const MEMORY_CONTEXT_MAX_CHARS = 900;
/** Presupuesto de historial reciente cuando hay memoria (≈ 700 tokens). */
export const MEMORY_HISTORY_CHAR_BUDGET = 2400;
const MEMORY_FALLBACK_MAX_SESSIONS = 500;
const MAX_INTERESTS = 6;
const CR_OFFSET_MS = 6 * 60 * 60 * 1000; // Costa Rica: UTC-6, sin horario de verano.
const MAX_DAYS_AHEAD = 730;

export type ConversationLanguage = 'es' | 'en';

export interface ConversationSlots {
  /** Fecha de viaje/tour YYYY-MM-DD (hora de Costa Rica). */
  date?: string;
  /** Rango de viaje cuando el cliente da inicio y fin. */
  dateRange?: { from: string; to: string };
  adults?: number;
  children?: number;
  /** Total de viajeros (adultos + niños, o el número que dio el cliente). */
  pax?: number;
  /** Zona canónica (ver ZONES). */
  zone?: string;
  /** Intereses canónicos (categorías del catálogo). */
  interests?: string[];
  budget?: { amount: number; currency: 'USD' | 'CRC'; per?: 'person' | 'total' };
  language?: ConversationLanguage;
}

export interface ConversationTurn { role: 'user' | 'assistant'; text: string; at: string }

export interface ConversationState {
  version: 1;
  slots: ConversationSlots;
  /** Resumen determinista de turnos viejos (sin datos personales). */
  summary: string;
  turns: ConversationTurn[];
  turnCount: number;
  createdAt: string;
  updatedAt: string;
  /** Vencimiento (TTL): 7 días desde la última actividad. */
  expiresAt: string;
  /** Campo libre para extensiones (p. ej. embudo de reserva). Solo primitivos/objetos pequeños. */
  extra?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Privacidad
// ---------------------------------------------------------------------------

const EMAIL_GLOBAL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const URL_GLOBAL = /(https?:\/\/|www\.|wa\.me\/)\S*/gi;
const LONG_DIGITS_GLOBAL = /\+?(\d[\s\-().+]*){6,}\d/g;
/** Fechas (2026-11-15, 15/11/2026) no son teléfonos: se conservan. */
const DATE_LIKE = /^(20\d{2}-\d{1,2}-\d{1,2}|\d{1,2}[/.]\d{1,2}[/.](20)?\d{2})$/;
const NAME_INTRO = /\b(me llamo|mi nombre es|soy (?:el|la) se[nñ]or(?:a)?|my name is|i am called|this is)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ'-]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñÑ'-]+){0,3}/gi;

/** Texto apto para guardar: sin correos, URLs, teléfonos/documentos ni nombres presentados. */
export function redactConversationText(input: unknown, max = CONVERSATION_TURN_MAX_CHARS): string {
  let text = String(input ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(EMAIL_GLOBAL, '[correo]')
    .replace(URL_GLOBAL, '[enlace]')
    .replace(NAME_INTRO, (_m, intro) => `${intro} [nombre]`);
  text = redactPii(text)
    .replace(LONG_DIGITS_GLOBAL, (m) => (DATE_LIKE.test(m.trim()) ? m : '[número]'))
    .replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Id de documento: hash de la sesión (nunca la sesión en claro). */
export function conversationDocId(sessionId: unknown): string | null {
  return hashIdentifier('session', sessionId);
}

// ---------------------------------------------------------------------------
// Extracción determinista de preferencias (es/en)
// ---------------------------------------------------------------------------

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const NUMBER_WORDS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const NUM = '(\\d{1,2}|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|one|two|three|four|five|six|seven|eight|nine|ten)';
const toNum = (raw: string) => (/^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS[raw] ?? NaN);

const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12, dic: 12, ene: 1, abr: 4, ago: 8,
};
const MONTH_RE = '(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec|dic|ene|abr|ago)';

export interface ZoneDef { key: string; label: { es: string; en: string }; regions: string[]; pattern: RegExp }

/** Zonas canónicas → regiones del catálogo (src/data/toursCatalog.ts). */
export const ZONES: ZoneDef[] = [
  { key: 'arenal', label: { es: 'Arenal / La Fortuna', en: 'Arenal / La Fortuna' }, regions: ['arenal'], pattern: /\b(arenal|la fortuna|fortuna)\b/ },
  { key: 'monteverde', label: { es: 'Monteverde', en: 'Monteverde' }, regions: ['monteverde'], pattern: /\b(monteverde|santa elena)\b/ },
  { key: 'manuel_antonio', label: { es: 'Manuel Antonio / Quepos', en: 'Manuel Antonio / Quepos' }, regions: ['manuel_antonio', 'central_pacific'], pattern: /\b(manuel antonio|quepos)\b/ },
  { key: 'jaco', label: { es: 'Jacó', en: 'Jaco' }, regions: ['jaco', 'central_pacific'], pattern: /\b(jaco|playa hermosa|herradura)\b/ },
  { key: 'guanacaste', label: { es: 'Guanacaste', en: 'Guanacaste' }, regions: ['guanacaste'], pattern: /\b(guanacaste|tamarindo|papagayo|liberia|nosara|conchal|flamingo|rincon de la vieja|samara)\b/ },
  { key: 'tortuguero', label: { es: 'Tortuguero', en: 'Tortuguero' }, regions: ['tortuguero'], pattern: /\btortuguero\b/ },
  { key: 'caribe_sur', label: { es: 'Caribe Sur', en: 'South Caribbean' }, regions: ['caribe_sur', 'caribe'], pattern: /\b(puerto viejo|cahuita|manzanillo|caribe|caribbean|limon)\b/ },
  { key: 'sarapiqui', label: { es: 'Sarapiquí', en: 'Sarapiqui' }, regions: ['sarapiqui'], pattern: /\bsarapiqui\b/ },
  { key: 'osa', label: { es: 'Península de Osa / Corcovado', en: 'Osa Peninsula / Corcovado' }, regions: ['osa', 'corcovado', 'golfo_dulce'], pattern: /\b(osa|drake|corcovado|puerto jimenez|golfo dulce)\b/ },
  { key: 'uvita', label: { es: 'Uvita / Dominical', en: 'Uvita / Dominical' }, regions: ['uvita', 'marino_ballena', 'dominical'], pattern: /\b(uvita|dominical|marino ballena|ojochal)\b/ },
  { key: 'perez_zeledon', label: { es: 'Pérez Zeledón / Chirripó', en: 'Perez Zeledon / Chirripo' }, regions: ['perez_zeledon'], pattern: /\b(perez zeledon|san isidro del general|chirripo)\b/ },
  { key: 'los_santos', label: { es: 'Zona de Los Santos', en: 'Los Santos' }, regions: ['los_santos'], pattern: /\b(los santos|tarrazu|dota|san gerardo de dota)\b/ },
  { key: 'golfito', label: { es: 'Golfito', en: 'Golfito' }, regions: ['golfito'], pattern: /\bgolfito\b/ },
  { key: 'turrialba', label: { es: 'Turrialba / Pacuare', en: 'Turrialba / Pacuare' }, regions: ['turrialba', 'pacuare'], pattern: /\b(turrialba|pacuare)\b/ },
  { key: 'cartago', label: { es: 'Cartago / Irazú / Orosi', en: 'Cartago / Irazu / Orosi' }, regions: ['cartago'], pattern: /\b(cartago|irazu|orosi)\b/ },
  { key: 'san_jose', label: { es: 'San José / Valle Central', en: 'San Jose / Central Valley' }, regions: ['san_jose', 'sjo'], pattern: /\b(san jose|escazu|valle central|central valley|alajuela|heredia|poas)\b/ },
];

export interface InterestDef { key: string; label: { es: string; en: string }; pattern: RegExp }

/** Intereses canónicos = categorías del catálogo. */
export const INTERESTS: InterestDef[] = [
  { key: 'rafting', label: { es: 'rafting', en: 'rafting' }, pattern: /\b(rafting|rapidos|white ?water)\b/ },
  { key: 'canopy', label: { es: 'canopy', en: 'zipline' }, pattern: /\b(canopy|zip ?lines?|zipline|tirolesa|tirolina)\b/ },
  { key: 'volcanoes', label: { es: 'volcanes', en: 'volcanoes' }, pattern: /\b(volcan(es)?|volcano(es)?)\b/ },
  { key: 'wildlife', label: { es: 'fauna', en: 'wildlife' }, pattern: /\b(wildlife|fauna|animales|animals|perezosos?|sloths?|monos?|monkeys?|aves|birds?|birdwatching|avistamiento|tortugas?|turtles?|cocodrilos?|crocodiles?)\b/ },
  { key: 'beaches', label: { es: 'playa', en: 'beach' }, pattern: /\b(playas?|beach(es)?)\b/ },
  { key: 'hiking', label: { es: 'senderismo', en: 'hiking' }, pattern: /\b(senderismo|caminatas?|hik(e|es|ing)|trek(king)?)\b/ },
  { key: 'waterfalls', label: { es: 'cataratas', en: 'waterfalls' }, pattern: /\b(cataratas?|cascadas?|waterfalls?)\b/ },
  { key: 'snorkeling', label: { es: 'snorkel', en: 'snorkeling' }, pattern: /\bsnorkel(ing)?\b/ },
  { key: 'diving', label: { es: 'buceo', en: 'diving' }, pattern: /\b(buceo|bucear|diving|scuba)\b/ },
  { key: 'surf', label: { es: 'surf', en: 'surf' }, pattern: /\bsurf(ing|ear)?\b/ },
  { key: 'fishing', label: { es: 'pesca', en: 'fishing' }, pattern: /\b(pesca|pescar|fishing)\b/ },
  { key: 'kayak', label: { es: 'kayak', en: 'kayak' }, pattern: /\b(kayak|paddle ?board|paddle)\b/ },
  { key: 'whale_watching', label: { es: 'ballenas y delfines', en: 'whales and dolphins' }, pattern: /\b(ballenas?|whales?|delfines|dolphins?)\b/ },
  { key: 'gastronomy', label: { es: 'café y gastronomía', en: 'coffee and food' }, pattern: /\b(cafe|coffee|chocolate|cacao|gastronomia|comida tipica|food tour)\b/ },
  { key: 'culture', label: { es: 'cultura', en: 'culture' }, pattern: /\b(cultura|cultural|culture|indigena|indigenous|historia|history)\b/ },
  { key: 'nature', label: { es: 'naturaleza', en: 'nature' }, pattern: /\b(naturaleza|nature|bosque|forest|nuboso|cloud forest|aguas termales|termales|hot springs?)\b/ },
  { key: 'adventure', label: { es: 'aventura', en: 'adventure' }, pattern: /\b(aventura|adventure|extremo|extreme|adrenalina|adrenaline)\b/ },
];

/** Fecha de hoy en Costa Rica (YYYY-MM-DD). */
export function todayInCostaRica(now: Date): string {
  return new Date(now.getTime() - CR_OFFSET_MS).toISOString().slice(0, 10);
}

function isoFrom(y: number, m: number, d: number): string | null {
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return dt.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Fecha futura válida (hoy … +730 días). Sin año: el próximo que caiga hoy o después. */
function futureDate(m: number, d: number, year: number | undefined, today: string): string | null {
  const ty = Number(today.slice(0, 4));
  let iso = isoFrom(year ?? ty, m, d);
  if (!iso) return null;
  if (year === undefined && iso < today) iso = isoFrom(ty + 1, m, d);
  if (!iso || iso < today || iso > addDays(today, MAX_DAYS_AHEAD)) return null;
  return iso;
}

const normYear = (raw?: string) => (raw ? (raw.length === 2 ? 2000 + Number(raw) : Number(raw)) : undefined);

/** Extrae fecha o rango de fechas de un texto. */
export function extractDates(text: string, now: Date, language?: ConversationLanguage): Pick<ConversationSlots, 'date' | 'dateRange'> {
  const t = norm(text);
  const today = todayInCostaRica(now);
  const out: Pick<ConversationSlots, 'date' | 'dateRange'> = {};
  const setRange = (a: string | null, b: string | null) => {
    if (a && b && b >= a) { out.dateRange = { from: a, to: b }; out.date = a; return true; }
    return false;
  };

  // Rangos: "del 10 al 15 de diciembre", "10-15 de diciembre", "dec 10 to 15", "from december 10 to 15".
  let m = t.match(new RegExp(`(?:del?\\s+)?(\\d{1,2})\\s*(?:al|a|-|–|hasta)\\s*(\\d{1,2})\\s*(?:de\\s+)?${MONTH_RE}(?:\\s+(?:de|del)?\\s*(20\\d{2}))?`));
  if (m && setRange(futureDate(MONTHS[m[3]], Number(m[1]), normYear(m[4]), today), futureDate(MONTHS[m[3]], Number(m[2]), normYear(m[4]), today))) return out;
  m = t.match(new RegExp(`${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|–|to|through|until|al)\\s*(?:${MONTH_RE}\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(20\\d{2}))?`));
  if (m && setRange(futureDate(MONTHS[m[1]], Number(m[2]), normYear(m[5]), today), futureDate(MONTHS[m[3] || m[1]], Number(m[4]), normYear(m[5]), today))) return out;

  // ISO.
  const isoAll = [...t.matchAll(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g)].map(x => futureDate(Number(x[2]), Number(x[3]), Number(x[1]), today)).filter(Boolean) as string[];
  if (isoAll.length >= 2 && setRange(isoAll[0], isoAll[1])) return out;
  if (isoAll.length) { out.date = isoAll[0]; return out; }

  // "15 de noviembre (de 2026)" / "november 15(, 2026)" / "15 nov".
  m = t.match(new RegExp(`\\b(\\d{1,2})\\s*(?:de\\s+)?${MONTH_RE}\\b(?:\\s+(?:de|del)?\\s*(20\\d{2}))?`));
  if (m) { const d = futureDate(MONTHS[m[2]], Number(m[1]), normYear(m[3]), today); if (d) { out.date = d; return out; } }
  m = t.match(new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s*(20\\d{2}))?`));
  if (m) { const d = futureDate(MONTHS[m[1]], Number(m[2]), normYear(m[3]), today); if (d) { out.date = d; return out; } }

  // Numérica: DD/MM(/AAAA) en español, MM/DD(/YYYY) en inglés.
  m = t.match(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](20\d{2}|\d{2}))?\b/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    const [mm, dd] = language === 'en' ? [a, b] : [b, a];
    const d = futureDate(mm, dd, normYear(m[3]), today);
    if (d) { out.date = d; return out; }
  }

  // Relativas.
  if (/\b(pasado manana|day after tomorrow)\b/.test(t)) out.date = addDays(today, 2);
  else if (/\b(manana|tomorrow)\b/.test(t) && !/\bpor la manana\b|\bde la manana\b|\bin the morning\b/.test(t)) out.date = addDays(today, 1);
  else if (/\b(hoy|today|tonight|esta noche)\b/.test(t)) out.date = today;
  return out;
}

/** Extrae adultos, niños y total de viajeros. */
export function extractPax(text: string): Pick<ConversationSlots, 'adults' | 'children' | 'pax'> {
  const t = norm(text);
  const out: Pick<ConversationSlots, 'adults' | 'children' | 'pax'> = {};
  const valid = (n: number) => Number.isInteger(n) && n >= 0 && n <= 50;
  let m = t.match(new RegExp(`\\b${NUM}\\s*(?:adult[oa]s?|adults?|mayores|grown-?ups?)\\b`));
  if (m && valid(toNum(m[1]))) out.adults = toNum(m[1]);
  m = t.match(new RegExp(`\\b${NUM}\\s*(?:nin[oa]s?|kids?|children|childs?|menores|hij[oa]s?|chicos)\\b`));
  if (m && valid(toNum(m[1]))) out.children = toNum(m[1]);
  if (out.adults !== undefined || out.children !== undefined) {
    const total = (out.adults ?? 0) + (out.children ?? 0);
    if (total > 0) out.pax = total;
    return out;
  }
  m = t.match(new RegExp(`\\b${NUM}\\s*(?:personas|persons|people|pax|viajeros|travell?ers|guests|huespedes|participantes|participants)\\b`));
  if (!m) m = t.match(new RegExp(`\\b(?:somos|seremos|vamos|iremos|we are|we're|we will be|party of|grupo de|group of)\\s+${NUM}\\b(?!\\s*(?:dias|days|noches|nights|horas|hours|semanas|weeks))`));
  if (!m) m = t.match(new RegExp(`\\bfor\\s+${NUM}\\s*(?:of us|people|persons|adults)\\b`));
  if (!m) m = t.match(new RegExp(`\\bpara\\s+${NUM}\\s*(?:personas|adultos)\\b`));
  if (m && valid(toNum(m[1])) && toNum(m[1]) > 0) { out.pax = toNum(m[1]); return out; }
  if (/\b(en pareja|mi (?:esposa|esposo|novia|novio|pareja) y yo|my (?:wife|husband|partner|girlfriend|boyfriend) and i|a couple|as a couple|honeymoon|luna de miel)\b/.test(t)) { out.pax = 2; out.adults = 2; return out; }
  if (/\b(solo yo|voy solo|voy sola|viajo solo|viajo sola|just me|only me|traveling alone|travelling alone|solo traveler|by myself)\b/.test(t)) { out.pax = 1; out.adults = 1; }
  return out;
}

export function extractZone(text: string): string | undefined {
  const t = norm(text);
  return ZONES.find(z => z.pattern.test(t))?.key;
}

export function extractInterests(text: string): string[] {
  const t = norm(text);
  return INTERESTS.filter(i => i.pattern.test(t)).map(i => i.key);
}

/** Presupuesto solo con palabra clave de presupuesto o moneda explícita de colones. */
export function extractBudget(text: string): ConversationSlots['budget'] | undefined {
  const t = norm(text);
  const per = /\b(por persona|per person|each|c\/u|cada uno|pp)\b/.test(t) ? 'person' as const
    : /\b(en total|total|for all|para todos)\b/.test(t) ? 'total' as const : undefined;
  const parseAmount = (raw: string) => {
    const clean = raw.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.');
    const n = Number(clean);
    return Number.isFinite(n) && n > 0 && n < 100_000_000 ? n : NaN;
  };
  let m = t.match(/(?:presupuesto|budget|maximo|max(?:imum)?|hasta|under|less than|menos de|no mas de|up to|around|alrededor de|unos)\s*(?:de|of|is|es)?\s*(?:us\$|\$|usd\s*|₡\s*)?(\d[\d.,]*)\s*(usd|dolares|dollars|bucks|colones|crc|mil colones)?/);
  if (m) {
    let amount = parseAmount(m[1]);
    const crc = /colones|crc/.test(m[2] || '') || /₡/.test(m[0]);
    if (/mil colones/.test(m[2] || '')) amount *= 1000;
    if (Number.isFinite(amount)) return { amount, currency: crc ? 'CRC' : 'USD', ...(per ? { per } : {}) };
  }
  m = t.match(/₡\s*(\d[\d.,]*)|(\d[\d.,]*)\s*colones/);
  if (m) {
    const amount = parseAmount(m[1] || m[2]);
    if (Number.isFinite(amount)) return { amount, currency: 'CRC', ...(per ? { per } : {}) };
  }
  return undefined;
}

const ES_MARKERS = /[ñ¿¡]|\b(hola|quiero|quisiera|para|somos|personas|gracias|cuanto|cuesta|tour(es)? de|me gustaria|reservar|fecha|ninos|adultos|buenas|donde|que|como|necesito|por favor|presupuesto|playa)\b/;
const EN_MARKERS = /\b(hello|hi|want|would like|we are|people|thanks|thank you|how much|price|book|booking|date|kids|adults|where|what|how|need|please|budget|beach|the|and|for)\b/;

/** Idioma del texto (es/en) o undefined si no hay señales claras. */
export function detectLanguage(text: string): ConversationLanguage | undefined {
  const raw = String(text || '');
  const t = norm(raw);
  const es = (t.match(new RegExp(ES_MARKERS.source, 'g')) || []).length + (/[ñ¿¡áéíóú]/.test(raw) ? 2 : 0);
  const en = (t.match(new RegExp(EN_MARKERS.source, 'g')) || []).length;
  if (es === 0 && en === 0) return undefined;
  if (es === en) return undefined;
  return es > en ? 'es' : 'en';
}

/** Todos los slots que se pueden leer en un mensaje del cliente. */
export function extractSlots(text: string, now: Date, languageHint?: ConversationLanguage): ConversationSlots {
  const language = detectLanguage(text);
  const slots: ConversationSlots = {
    ...extractDates(text, now, language || languageHint),
    ...extractPax(text),
  };
  const zone = extractZone(text);
  if (zone) slots.zone = zone;
  const interests = extractInterests(text);
  if (interests.length) slots.interests = interests;
  const budget = extractBudget(text);
  if (budget) slots.budget = budget;
  if (language) slots.language = language;
  return slots;
}

/** Lo nuevo reemplaza a lo viejo; los intereses se acumulan (máx. 6, los más recientes). */
export function mergeSlots(prev: ConversationSlots, next: ConversationSlots): ConversationSlots {
  const merged: ConversationSlots = { ...prev };
  for (const [k, v] of Object.entries(next) as Array<[keyof ConversationSlots, any]>) {
    if (v === undefined || k === 'interests') continue;
    (merged as any)[k] = v;
  }
  if (next.date && !next.dateRange) delete merged.dateRange;
  if (next.pax !== undefined && next.adults === undefined && next.children === undefined) { delete merged.adults; delete merged.children; }
  if (next.interests?.length) {
    const all = [...(prev.interests || []).filter(i => !next.interests!.includes(i)), ...next.interests];
    merged.interests = all.slice(-MAX_INTERESTS);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Estado, resumen y presupuesto de tokens
// ---------------------------------------------------------------------------

export function emptyConversationState(now: Date): ConversationState {
  const at = now.toISOString();
  return { version: 1, slots: {}, summary: '', turns: [], turnCount: 0, createdAt: at, updatedAt: at, expiresAt: expiryFrom(now) };
}

export function expiryFrom(now: Date): string {
  return new Date(now.getTime() + CONVERSATION_STATE_TTL_DAYS * 86_400_000).toISOString();
}

/** Estimación conservadora (≈ 3,5 caracteres por token en es/en). */
export function estimateTokens(text: string): number {
  return Math.ceil(String(text || '').length / 3.5);
}

/** Resume de forma determinista los turnos que salen de la ventana reciente. */
export function summarizeTurns(previousSummary: string, dropped: ConversationTurn[]): string {
  const bits = dropped
    .filter(t => t.role === 'user')
    .map(t => t.text.replace(/\s+/g, ' ').trim().slice(0, 140))
    .filter(Boolean);
  if (!bits.length) return previousSummary;
  let summary = [previousSummary, ...bits].filter(Boolean).join(' | ');
  if (summary.length > CONVERSATION_SUMMARY_MAX_CHARS) summary = `…${summary.slice(-(CONVERSATION_SUMMARY_MAX_CHARS - 1))}`;
  return summary;
}

function pushTurn(state: ConversationState, role: 'user' | 'assistant', text: string, now: Date): ConversationState {
  const clean = redactConversationText(text);
  if (!clean) return state;
  const turns = [...state.turns, { role, text: clean, at: now.toISOString() }];
  const overflow = Math.max(0, turns.length - CONVERSATION_RECENT_TURNS);
  const dropped = turns.slice(0, overflow);
  return {
    ...state,
    turns: turns.slice(overflow),
    summary: summarizeTurns(state.summary, dropped),
    turnCount: state.turnCount + 1,
    updatedAt: now.toISOString(),
    expiresAt: expiryFrom(now),
  };
}

/** Aplica el mensaje del cliente: extrae preferencias y agrega el turno saneado. */
export function applyUserTurn(state: ConversationState, message: string, now: Date, languageHint?: ConversationLanguage): ConversationState {
  const slots = mergeSlots(state.slots, extractSlots(message, now, state.slots.language || languageHint));
  if (!slots.language && languageHint) slots.language = languageHint;
  return pushTurn({ ...state, slots }, 'user', message, now);
}

export function applyAssistantTurn(state: ConversationState, reply: string, now: Date): ConversationState {
  return pushTurn(state, 'assistant', reply, now);
}

/** Turnos recientes como historial del modelo, sin el último mensaje del cliente y dentro del presupuesto. */
export function recentHistory(state: ConversationState, opts: { excludeLastUser?: boolean; maxChars?: number } = {}): Array<{ role: 'user' | 'assistant'; text: string }> {
  let turns = state.turns;
  if (opts.excludeLastUser && turns.length && turns[turns.length - 1].role === 'user') turns = turns.slice(0, -1);
  const budget = opts.maxChars ?? MEMORY_HISTORY_CHAR_BUDGET;
  const out: Array<{ role: 'user' | 'assistant'; text: string }> = [];
  let used = 0;
  for (let i = turns.length - 1; i >= 0; i--) {
    const text = turns[i].text;
    if (used + text.length > budget) break;
    used += text.length;
    out.unshift({ role: turns[i].role, text });
  }
  return out;
}

/** Recorta el historial que manda el cliente al mismo presupuesto (los más recientes primero). */
export function fitHistoryToBudget<T extends { text: string }>(history: T[], maxChars = MEMORY_HISTORY_CHAR_BUDGET, perTurn = 600): T[] {
  const out: T[] = [];
  let used = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const text = String(history[i]?.text || '').slice(0, perTurn);
    if (!text) continue;
    if (used + text.length > maxChars) break;
    used += text.length;
    out.unshift({ ...history[i], text });
  }
  return out;
}

export function zoneLabel(key: string | undefined, lang: ConversationLanguage): string | undefined {
  return key ? ZONES.find(z => z.key === key)?.label[lang] ?? key : undefined;
}

export function interestLabels(keys: string[] | undefined, lang: ConversationLanguage): string[] {
  return (keys || []).map(k => INTERESTS.find(i => i.key === k)?.label[lang] ?? k);
}

/** Preferencias en una línea legible (para el modelo y para respuestas deterministas). */
export function describeSlots(slots: ConversationSlots, lang: ConversationLanguage): string {
  const en = lang === 'en';
  const parts: string[] = [];
  if (slots.dateRange) parts.push(`${en ? 'dates' : 'fechas'}: ${slots.dateRange.from} → ${slots.dateRange.to}`);
  else if (slots.date) parts.push(`${en ? 'date' : 'fecha'}: ${slots.date}`);
  if (slots.pax) {
    const detail = slots.adults !== undefined || slots.children !== undefined
      ? ` (${slots.adults ?? 0} ${en ? (slots.adults === 1 ? 'adult' : 'adults') : (slots.adults === 1 ? 'adulto' : 'adultos')}, ${slots.children ?? 0} ${en ? (slots.children === 1 ? 'child' : 'children') : (slots.children === 1 ? 'niño' : 'niños')})` : '';
    parts.push(`${en ? 'travelers' : 'personas'}: ${slots.pax}${detail}`);
  }
  if (slots.zone) parts.push(`${en ? 'area' : 'zona'}: ${zoneLabel(slots.zone, lang)}`);
  if (slots.interests?.length) parts.push(`${en ? 'interests' : 'intereses'}: ${interestLabels(slots.interests, lang).join(', ')}`);
  if (slots.budget) {
    const per = slots.budget.per === 'person' ? (en ? ' per person' : ' por persona') : slots.budget.per === 'total' ? (en ? ' total' : ' en total') : '';
    parts.push(`${en ? 'budget' : 'presupuesto'}: ${slots.budget.currency === 'CRC' ? '₡' : 'USD '}${slots.budget.amount}${per}`);
  }
  if (slots.language) parts.push(`${en ? 'language' : 'idioma'}: ${slots.language}`);
  return parts.join('; ');
}

/** Bloque compacto de memoria para el modelo (sin datos personales). Cadena vacía si no hay nada. */
export function buildMemoryContext(state: ConversationState, lang: ConversationLanguage): string {
  const prefs = describeSlots(state.slots, lang);
  if (!prefs && !state.summary) return '';
  const en = lang === 'en';
  const lines = [
    en ? 'CONVERSATION MEMORY (this customer, earlier turns; do not ask again for what is here):' : 'MEMORIA DE LA CONVERSACIÓN (este cliente, turnos anteriores; no vuelvas a preguntar lo que ya está aquí):',
    prefs ? `${en ? 'Preferences' : 'Preferencias'}: ${prefs}` : '',
    state.summary ? `${en ? 'Earlier messages (summary)' : 'Mensajes anteriores (resumen)'}: ${state.summary}` : '',
  ].filter(Boolean).join('\n');
  return lines.length > MEMORY_CONTEXT_MAX_CHARS ? `${lines.slice(0, MEMORY_CONTEXT_MAX_CHARS - 1)}…` : lines;
}

// ---------------------------------------------------------------------------
// Almacenamiento (Firestore solo servidor, con respaldo en memoria)
// ---------------------------------------------------------------------------

export interface ConversationStore {
  get(docId: string): Promise<Record<string, any> | null>;
  set(docId: string, data: Record<string, any>): Promise<void>;
}

type FirestoreLike = { collection: (name: string) => { doc: (id: string) => { get: () => Promise<{ exists: boolean; data: () => any }>; set: (data: any) => Promise<unknown> } } };

export function firestoreConversationStore(db: FirestoreLike): ConversationStore {
  return {
    async get(docId) {
      const snap = await db.collection(CONVERSATION_STATE_COLLECTION).doc(docId).get();
      return snap?.exists ? (snap.data() || null) : null;
    },
    async set(docId, data) {
      // expiresAt como Date ⇒ Timestamp de Firestore (apto para una política TTL).
      const plain = JSON.parse(JSON.stringify(data)); // sin undefined (Firestore los rechaza)
      await db.collection(CONVERSATION_STATE_COLLECTION).doc(docId).set({ ...plain, expiresAtTs: new Date(String(data.expiresAt)) });
    },
  };
}

/** Respaldo en memoria acotado (tests, local, sin Firestore). Se pierde al reiniciar. */
export function memoryConversationStore(max = MEMORY_FALLBACK_MAX_SESSIONS): ConversationStore & { size: () => number } {
  const map = new Map<string, Record<string, any>>();
  return {
    async get(docId) { const v = map.get(docId); return v ? JSON.parse(JSON.stringify(v)) : null; },
    async set(docId, data) {
      map.delete(docId);
      map.set(docId, JSON.parse(JSON.stringify(data)));
      while (map.size > max) map.delete(map.keys().next().value as string);
    },
    size: () => map.size,
  };
}

const fallbackStore = memoryConversationStore();

export interface ConversationStateDeps {
  store?: ConversationStore;
  now?: () => Date;
}

async function resolveStore(deps: ConversationStateDeps): Promise<ConversationStore> {
  if (deps.store) return deps.store;
  try {
    const db = (await import('./bookingService')).getFirestoreDb();
    if (db) return firestoreConversationStore(db as any);
  } catch { /* sin Firestore: respaldo en memoria */ }
  return fallbackStore;
}

function sanitizeLoaded(raw: Record<string, any>, now: Date): ConversationState | null {
  const expiresAt = String(raw?.expiresAt || '');
  if (!expiresAt || Number.isNaN(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now.getTime()) return null;
  const base = emptyConversationState(now);
  const turns = Array.isArray(raw.turns) ? raw.turns
    .filter((t: any) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string')
    .slice(-CONVERSATION_RECENT_TURNS)
    .map((t: any) => ({ role: t.role, text: String(t.text).slice(0, CONVERSATION_TURN_MAX_CHARS), at: String(t.at || '') })) : [];
  return {
    ...base,
    slots: raw.slots && typeof raw.slots === 'object' ? raw.slots : {},
    summary: typeof raw.summary === 'string' ? raw.summary.slice(0, CONVERSATION_SUMMARY_MAX_CHARS) : '',
    turns,
    turnCount: Number.isInteger(raw.turnCount) ? raw.turnCount : turns.length,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : base.createdAt,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt,
    expiresAt,
    ...(raw.extra && typeof raw.extra === 'object' ? { extra: raw.extra } : {}),
  };
}

/** Lee el estado de la sesión (nuevo si no existe o venció). Nunca lanza. */
export async function loadConversationState(sessionId: string, deps: ConversationStateDeps = {}): Promise<ConversationState> {
  const now = (deps.now ?? (() => new Date()))();
  const docId = conversationDocId(sessionId);
  if (!docId) return emptyConversationState(now);
  try {
    const raw = await (await resolveStore(deps)).get(docId);
    return (raw && sanitizeLoaded(raw, now)) || emptyConversationState(now);
  } catch {
    return emptyConversationState(now);
  }
}

/** Guarda el estado (id = hash de la sesión). Nunca lanza: devuelve si se guardó. */
export async function saveConversationState(sessionId: string, state: ConversationState, deps: ConversationStateDeps = {}): Promise<boolean> {
  const docId = conversationDocId(sessionId);
  if (!docId) return false;
  try {
    await (await resolveStore(deps)).set(docId, {
      ...state,
      sessionIdHash: docId,
      source: 'customer_concierge',
    });
    return true;
  } catch {
    return false;
  }
}
