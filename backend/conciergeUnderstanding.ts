/**
 * Concierge (travel assistant) server-side understanding.
 *
 * Deterministic extraction of what a traveller asked for (activity / tour,
 * party size, month or exact date, region, budget and language) plus a
 * catalog *reference* quote and a prefilled WhatsApp hand-off. It runs on
 * every /api/gemini/concierge call, before and independently of the AI model,
 * so the traveller always gets a concrete, honest answer even when the model
 * fails or no AI key is configured.
 *
 * Honesty rules (see tests/conciergeUnderstanding.test.ts):
 *  - prices are catalog references × people, always labelled
 *    "referencia, sujeto a confirmación" / "reference, subject to confirmation";
 *  - operators are not signed yet: nothing here confirms an operator, a slot
 *    or a booking, and no message is sent to anyone.
 */

import { parseTripRequest, type CatalogTourLike } from '../src/utils/tripRequestParser';
import { referenceTotalLine, formatUsdReference } from '../src/utils/referencePrice';
import { directWhatsAppUrl } from '../src/utils/directWhatsApp';

export type ConciergeLanguage = 'es' | 'en';

export const JOSE_WHATSAPP_E164 = '+50687959148';

export interface ConciergeUnderstood {
  language: ConciergeLanguage;
  activity?: string;
  activityLabel?: string;
  tourId?: string;
  tourTitle?: string;
  people?: number;
  adults?: number;
  children?: number;
  month?: number;
  monthName?: string;
  /** ISO yyyy-mm-dd when the traveller gave an exact day. */
  date?: string;
  region?: string;
  regionLabel?: string;
  budget?: { amount: number; currency: 'USD' | 'CRC'; per: 'total' | 'person' };
  /** Duración del viaje ("3 días", "for 3 days"): nunca se confunde con personas. */
  days?: number;
  nights?: number;
  asksPrice: boolean;
}

export interface ConciergeSuggestion {
  tourId: string;
  title: string;
  /** Precio de referencia del catálogo, marcado "referencia, sujeto a confirmación". */
  referenceLine?: string;
}

export interface ConciergeReferenceQuote {
  kind: 'reference';
  subjectToConfirmation: true;
  operatorConfirmed: false;
  tourId: string;
  unitPriceUSD: number;
  people?: number;
  totalUSD?: number;
  line: string;
  disclaimer: string;
  withinBudget?: boolean;
}

export interface ConciergeHandoff {
  source: 'server';
  understood: string[];
  tourId?: string;
  tourTitle?: string;
  referenceLine?: string;
  operatorNote: string;
  whatsappUrl: string;
  whatsappMessage: string;
}

export interface ConciergeUnderstanding {
  understood: ConciergeUnderstood;
  /** True when the message names a subject (activity/place/tour) plus a detail (people/date/price/budget). */
  isConcreteInquiry: boolean;
  quote?: ConciergeReferenceQuote;
  /** Ideas del catálogo para la zona cuando no hay una ficha única (p. ej. "¿qué hago en Uvita 3 días?"). */
  suggestions?: ConciergeSuggestion[];
  inquiryHandoff?: ConciergeHandoff;
}

const normalize = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const MONTH_NAMES: Record<ConciergeLanguage, string[]> = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const MONTH_TOKENS: Record<string, number> = {
  enero: 1, january: 1, jan: 1, febrero: 2, february: 2, feb: 2, marzo: 3, march: 3, mar: 3,
  abril: 4, april: 4, apr: 4, mayo: 5, may: 5, junio: 6, june: 6, jun: 6, julio: 7, july: 7, jul: 7,
  agosto: 8, august: 8, aug: 8, septiembre: 9, setiembre: 9, september: 9, sept: 9, sep: 9,
  octubre: 10, october: 10, oct: 10, noviembre: 11, november: 11, nov: 11, diciembre: 12, december: 12, dec: 12,
};
const MONTH_RE = Object.keys(MONTH_TOKENS).sort((a, b) => b.length - a.length).join('|');
// "mar" (sea) and "may" (modal verb) are too ambiguous without a day number.
const LOOSE_MONTH_RE = Object.keys(MONTH_TOKENS).filter(k => k !== 'mar' && k !== 'may').sort((a, b) => b.length - a.length).join('|');

/** Activities: catalog keywords are matched against tour id + title, not only category. */
const ACTIVITIES: Array<{ key: string; pattern: RegExp; tourKeywords: RegExp; categories: string[]; label: Record<ConciergeLanguage, string> }> = [
  { key: 'rafting', pattern: /\b(rafting|raft|balsa|rapidos|white ?water)\b/, tourKeywords: /rafting/, categories: ['rafting'], label: { es: 'rafting', en: 'rafting' } },
  { key: 'whale_watching', pattern: /\b(ballenas?|whales?|whale watching|delfines|dolphins?)\b/, tourKeywords: /whale|ballena/, categories: [], label: { es: 'avistamiento de ballenas', en: 'whale watching' } },
  { key: 'canopy', pattern: /\b(canopy|zip ?lines?|tirolesa|tirolina|cables)\b/, tourKeywords: /canopy|zip/, categories: ['canopy'], label: { es: 'canopy', en: 'zipline' } },
  { key: 'snorkel', pattern: /\b(snorkel|snorkeling|esnorquel|buceo|diving)\b/, tourKeywords: /snorkel/, categories: [], label: { es: 'snorkel', en: 'snorkeling' } },
  { key: 'volcanoes', pattern: /\b(volcan|volcano|termales|hot springs)\b/, tourKeywords: /volcan|volcano|hot-springs|termales/, categories: ['volcanoes'], label: { es: 'volcán / termales', en: 'volcano / hot springs' } },
  { key: 'wildlife', pattern: /\b(perezosos?|sloths?|fauna|wildlife|tortugas?|turtles?|aves|birding|caminata nocturna|night walk)\b/, tourKeywords: /sloth|wildlife|turtle|night|birding/, categories: ['wildlife'], label: { es: 'fauna', en: 'wildlife' } },
  { key: 'culture', pattern: /\b(cultura|cultural|cafe|coffee|chocolate|indigena|indigenous)\b/, tourKeywords: /culture|coffee|chocolate|indigenous|bribri/, categories: ['culture'], label: { es: 'cultura / café', en: 'culture / coffee' } },
];

/** Places → catalog region keys. */
const PLACES: Array<{ key: string; region: string; pattern: RegExp; label: string; tourKeywords?: RegExp }> = [
  { key: 'pacuare', region: 'pacuare', pattern: /\b(pacuare|turrialba|siquirres)\b/, label: 'Pacuare', tourKeywords: /pacuare/ },
  { key: 'sarapiqui', region: 'sarapiqui', pattern: /\bsarapiqui\b/, label: 'Sarapiquí', tourKeywords: /sarapiqui/ },
  { key: 'arenal', region: 'arenal', pattern: /\b(arenal|la fortuna|fortuna)\b/, label: 'Arenal / La Fortuna' },
  { key: 'monteverde', region: 'monteverde', pattern: /\bmonteverde\b/, label: 'Monteverde' },
  { key: 'manuel_antonio', region: 'manuel_antonio', pattern: /\b(manuel antonio|quepos)\b/, label: 'Manuel Antonio / Quepos' },
  { key: 'tortuguero', region: 'tortuguero', pattern: /\btortuguero\b/, label: 'Tortuguero' },
  { key: 'uvita', region: 'osa', pattern: /\b(uvita|marino ballena|dominical|ojochal|perez zeledon|san isidro)\b/, label: 'Uvita / Zona Sur', tourKeywords: /uvita|marino.ballena|nauyaca/ },
  { key: 'osa', region: 'osa', pattern: /\b(osa|corcovado|drake|sierpe|isla del cano|cano island)\b/, label: 'Osa / Corcovado' },
  { key: 'guanacaste', region: 'guanacaste', pattern: /\b(guanacaste|tamarindo|papagayo|rincon de la vieja|liberia)\b/, label: 'Guanacaste' },
  { key: 'caribe', region: 'caribe', pattern: /\b(caribe|caribbean|puerto viejo|cahuita|limon)\b/, label: 'Caribe Sur' },
  { key: 'sjo', region: 'sjo', pattern: /\b(san jose|valle central|central valley|poas|irazu|cartago|orosi)\b/, label: 'San José / Valle Central' },
];

const REGION_LABELS: Record<string, string> = Object.fromEntries(PLACES.map(p => [p.region, p.label]));

const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, one: 1, dos: 2, two: 2, tres: 3, three: 3, cuatro: 4, four: 4, cinco: 5, five: 5,
  seis: 6, six: 6, siete: 7, seven: 7, ocho: 8, eight: 8, nueve: 9, nine: 9, diez: 10, ten: 10,
};
const NUM = `(\\d{1,2}|${Object.keys(NUMBER_WORDS).join('|')})`;
const toNumber = (token: string): number => (/^\d+$/.test(token) ? Number(token) : NUMBER_WORDS[token] ?? NaN);

const EN_HINTS = /\b(i|we|want|would|like|how much|price|people|for|the|tour|in|please|book|cost|trip|next|kids|adults)\b/g;
const ES_HINTS = /\b(quiero|queremos|cuanto|cuesta|precio|personas|para|el|la|los|las|en|por favor|reservar|viaje|nosotros|ninos|adultos|de|con)\b/g;

export function detectLanguage(text: string, fallback: ConciergeLanguage = 'es'): ConciergeLanguage {
  const t = normalize(text);
  const en = (t.match(EN_HINTS) || []).length;
  const es = (t.match(ES_HINTS) || []).length;
  if (en === es) return fallback;
  return en > es ? 'en' : 'es';
}

function parseParty(text: string): { people?: number; adults?: number; children?: number } {
  const adultsM = text.match(new RegExp(`\\b${NUM}\\s*(adultos?|adults?)\\b`));
  const kidsM = text.match(new RegExp(`\\b${NUM}\\s*(ninos?|ninas?|menores|kids?|children|child)\\b`));
  const adults = adultsM ? toNumber(adultsM[1]) : undefined;
  const children = kidsM ? toNumber(kidsM[1]) : undefined;
  if (adults !== undefined || children !== undefined) {
    const people = (adults || 0) + (children || 0);
    if (people > 0 && people < 100) return { people, adults, children };
  }
  const base = parseTripRequest(text).people;
  if (base) return { people: base };
  const somos = text.match(new RegExp(`\\b(somos|we are|we're)\\s+${NUM}\\b`));
  if (somos) {
    const n = toNumber(somos[2]);
    if (n > 0 && n < 100) return { people: n };
  }
  return {};
}

function parseDuration(text: string): { days?: number; nights?: number } {
  const days = text.match(new RegExp(`\\b${NUM}\\s*(dias?|days?)\\b`));
  const nights = text.match(new RegExp(`\\b${NUM}\\s*(noches?|nights?)\\b`));
  const ok = (n: number) => n > 0 && n <= 60;
  const out: { days?: number; nights?: number } = {};
  if (days && ok(toNumber(days[1]))) out.days = toNumber(days[1]);
  if (nights && ok(toNumber(nights[1]))) out.nights = toNumber(nights[1]);
  return out;
}

function nextOccurrenceYear(month: number, day: number, now: Date): number {
  const year = now.getUTCFullYear();
  const candidate = Date.UTC(year, month - 1, day);
  const today = Date.UTC(year, now.getUTCMonth(), now.getUTCDate());
  return candidate < today ? year + 1 : year;
}

const pad = (n: number) => String(n).padStart(2, '0');

function validDay(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function parseDate(text: string, now: Date): { month?: number; date?: string } {
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    if (validDay(y, m, d)) return { month: m, date: `${y}-${pad(m)}-${pad(d)}` };
  }
  // "15 de diciembre", "15 diciembre 2026", "december 15", "dec 15th, 2026"
  const dayMonth = text.match(new RegExp(`\\b(\\d{1,2})\\s*(?:de\\s+)?(${MONTH_RE})\\b(?:\\s*(?:de\\s+|del\\s+)?(20\\d{2}))?`));
  const monthDay = text.match(new RegExp(`\\b(${MONTH_RE})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s*(20\\d{2}))?`));
  const hit = dayMonth
    ? { day: Number(dayMonth[1]), month: MONTH_TOKENS[dayMonth[2]], year: dayMonth[3] ? Number(dayMonth[3]) : undefined }
    : monthDay
      ? { day: Number(monthDay[2]), month: MONTH_TOKENS[monthDay[1]], year: monthDay[3] ? Number(monthDay[3]) : undefined }
      : undefined;
  if (hit && hit.month) {
    const year = hit.year ?? nextOccurrenceYear(hit.month, hit.day, now);
    if (validDay(year, hit.month, hit.day)) return { month: hit.month, date: `${year}-${pad(hit.month)}-${pad(hit.day)}` };
    return { month: hit.month };
  }
  // dd/mm[/yyyy] (Costa Rica convention)
  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/);
  if (slash) {
    const [d, m] = [Number(slash[1]), Number(slash[2])];
    if (m >= 1 && m <= 12) {
      const y = slash[3] ? Number(slash[3]) : nextOccurrenceYear(m, d, now);
      if (validDay(y, m, d)) return { month: m, date: `${y}-${pad(m)}-${pad(d)}` };
    }
  }
  const base = parseTripRequest(text).month;
  if (base && !(base === 5 && !/\b(mayo|in may|for may)\b/.test(text))) return { month: base };
  const loose = text.match(new RegExp(`\\b(en|in|para|for|de|durante|during)\\s+(${LOOSE_MONTH_RE})\\b`));
  return loose ? { month: MONTH_TOKENS[loose[2]] } : {};
}

function parseBudget(text: string): ConciergeUnderstood['budget'] {
  const hasBudgetWord = /(presupuesto|budget|maximo|max|hasta|up to|no mas de|no more than|tenemos|we have)/.test(text);
  const crc = text.match(/(?:₡|colones\s*)\s*([\d.,]{3,})|([\d.,]{3,})\s*(?:colones|crc)\b/);
  const usd = text.match(/(?:us\$|usd\s*|\$)\s*([\d.,]{2,})|([\d.,]{2,})\s*(?:usd|dolares|dollars|us dollars)\b/);
  const per: 'total' | 'person' = /(por persona|c\/u|cada uno|per person|each|pp)\b/.test(text) ? 'person' : 'total';
  const toAmount = (raw: string) => Number(raw.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
  if (crc && hasBudgetWord) {
    const amount = toAmount(crc[1] || crc[2]);
    if (amount > 0) return { amount, currency: 'CRC', per };
  }
  if (usd && hasBudgetWord) {
    const amount = toAmount(usd[1] || usd[2]);
    if (amount > 0) return { amount, currency: 'USD', per };
  }
  return undefined;
}

function tourTitle(tour: CatalogTourLike, language: ConciergeLanguage): string {
  if (typeof tour.title === 'string') return tour.title;
  return (language === 'es' ? tour.title.es : tour.title.en) || tour.title.es || tour.title.en || tour.id;
}

/**
 * Scores catalog tours against the request. An activity, when named, must be
 * present in the tour (keyword or category); a place, when named, must match
 * the tour's region or keywords. Never guesses across activities.
 */
export function matchTour<T extends CatalogTourLike>(
  activityKey: string | undefined,
  placeKey: string | undefined,
  tours: readonly T[],
): T | undefined {
  const activity = ACTIVITIES.find(a => a.key === activityKey);
  const place = PLACES.find(p => p.key === placeKey);
  if (!activity && !place) return undefined;
  let best: { tour: T; score: number } | undefined;
  for (const tour of tours) {
    const hay = normalize(`${tour.id} ${typeof tour.title === 'string' ? tour.title : `${tour.title.es || ''} ${tour.title.en || ''}`}`);
    let score = 0;
    if (activity) {
      const kw = activity.tourKeywords.test(hay);
      const cat = activity.categories.includes(tour.category);
      if (!kw && !cat) continue;
      score += (kw ? 3 : 0) + (cat ? 2 : 0);
    }
    if (place) {
      const kw = place.tourKeywords ? place.tourKeywords.test(hay) : false;
      const reg = tour.region === place.region;
      if (!kw && !reg) continue;
      score += (kw ? 3 : 0) + (reg ? 2 : 0);
    }
    if (!(tour.priceUSD > 0)) score -= 1;
    if (!best || score > best.score) best = { tour, score };
  }
  if (!best) return undefined;
  // Place only (no activity): accept only when the place has a single catalog tour.
  if (place && !activity) {
    const inPlace = tours.filter(t => t.region === place.region || (place.tourKeywords?.test(normalize(t.id)) ?? false));
    if (inPlace.length !== 1) return undefined;
  }
  // Activity only (no place): accept only when the activity resolves to a single best tour.
  if (activity && !place) {
    const tied = tours.filter(t => {
      const hay = normalize(`${t.id} ${typeof t.title === 'string' ? t.title : `${t.title.es || ''} ${t.title.en || ''}`}`);
      return activity.tourKeywords.test(hay) || activity.categories.includes(t.category);
    });
    if (tied.length !== 1) return undefined;
  }
  return best.tour;
}

export interface UnderstandOptions {
  requestedLanguage?: string;
  now?: Date;
}

export function understandConciergeMessage<T extends CatalogTourLike>(
  message: string,
  tours: readonly T[],
  options: UnderstandOptions = {},
): ConciergeUnderstanding {
  const raw = String(message || '').slice(0, 2000);
  const text = normalize(raw);
  const requested: ConciergeLanguage = options.requestedLanguage === 'en' ? 'en' : 'es';
  const language = detectLanguage(raw, requested);
  const now = options.now ?? new Date();

  const base = parseTripRequest(raw);
  const activity = ACTIVITIES.find(a => a.pattern.test(text));
  const place = PLACES.find(p => p.pattern.test(text));
  const party = parseParty(text);
  const when = parseDate(text, now);
  const budget = parseBudget(text);
  const duration = parseDuration(text);
  const tour = matchTour(activity?.key, place?.key, tours);
  const region = place?.region ?? tour?.region;

  const understood: ConciergeUnderstood = {
    language,
    asksPrice: base.asksPrice || /\b(cotizacion|cotizar|quote)\b/.test(text),
    ...(activity ? { activity: activity.key, activityLabel: activity.label[language] } : {}),
    ...(tour ? { tourId: tour.id, tourTitle: tourTitle(tour, language) } : {}),
    ...party,
    ...(when.month ? { month: when.month, monthName: MONTH_NAMES[language][when.month - 1] } : {}),
    ...(when.date ? { date: when.date } : {}),
    ...(region ? { region, regionLabel: REGION_LABELS[region] || region } : {}),
    ...(budget ? { budget } : {}),
    ...duration,
  };

  const hasSubject = Boolean(activity || place || tour);
  const hasDetail = understood.asksPrice || understood.people !== undefined || understood.month !== undefined || Boolean(budget)
    || understood.days !== undefined || understood.nights !== undefined;
  const isConcreteInquiry = hasSubject && hasDetail;
  const result: ConciergeUnderstanding = { understood, isConcreteInquiry };
  if (!isConcreteInquiry) return result;

  const es = language === 'es';
  // Zona sin ficha única: proponer actividades reales del catálogo (máx. 3), con su precio de referencia.
  if (!tour && region) {
    const inRegion = tours.filter(t => t.region === region || (place?.tourKeywords?.test(normalize(t.id)) ?? false))
      .filter(t => !activity || activity.tourKeywords.test(normalize(`${t.id} ${typeof t.title === 'string' ? t.title : `${t.title.es || ''} ${t.title.en || ''}`}`)) || activity.categories.includes(t.category));
    const picks = inRegion.slice(0, 3);
    if (picks.length) {
      result.suggestions = picks.map(t => ({
        tourId: t.id,
        title: tourTitle(t, language),
        ...(t.priceUSD > 0 ? { referenceLine: es
          ? `${formatUsdReference(t.priceUSD)} por persona (referencia, sujeto a confirmación)`
          : `${formatUsdReference(t.priceUSD)} per person (reference, subject to confirmation)` } : {}),
      }));
    }
  }
  if (tour && tour.priceUSD > 0) {
    const people = understood.people;
    const totalUSD = people ? tour.priceUSD * people : undefined;
    const line = people
      ? referenceTotalLine(tour.priceUSD, people, language)
      : (es
        ? `${formatUsdReference(tour.priceUSD)} por persona (referencia, sujeto a confirmación)`
        : `${formatUsdReference(tour.priceUSD)} per person (reference, subject to confirmation)`);
    let withinBudget: boolean | undefined;
    if (budget && budget.currency === 'USD') {
      const compare = budget.per === 'person' ? tour.priceUSD : totalUSD;
      if (compare !== undefined) withinBudget = compare <= budget.amount;
    }
    result.quote = {
      kind: 'reference',
      subjectToConfirmation: true,
      operatorConfirmed: false,
      tourId: tour.id,
      unitPriceUSD: tour.priceUSD,
      ...(people ? { people, totalUSD } : {}),
      line,
      disclaimer: es
        ? 'Precio de referencia del catálogo, sujeto a confirmación de operador, fecha y cupo. No es una reserva ni un cobro.'
        : 'Catalog reference price, subject to confirmation of operator, date and availability. Not a booking or a charge.',
      ...(withinBudget !== undefined ? { withinBudget } : {}),
    };
  }

  const lines: string[] = [];
  const what = [activity?.label[language], place?.label].filter(Boolean).join(es ? ' en ' : ' in ');
  if (what) lines.push(es ? `Experiencia: ${what}` : `Experience: ${what}`);
  if (understood.tourTitle) lines.push(es ? `Ficha de catálogo: ${understood.tourTitle}` : `Catalog listing: ${understood.tourTitle}`);
  if (understood.people) {
    const detail = understood.adults !== undefined || understood.children !== undefined
      ? ` (${understood.adults ?? 0} ${es ? 'adultos' : 'adults'}, ${understood.children ?? 0} ${es ? 'niños' : 'children'})`
      : '';
    lines.push(es ? `Personas: ${understood.people}${detail}` : `People: ${understood.people}${detail}`);
  }
  if (understood.days || understood.nights) {
    const parts = [
      understood.days ? (es ? `${understood.days} día${understood.days === 1 ? '' : 's'}` : `${understood.days} day${understood.days === 1 ? '' : 's'}`) : '',
      understood.nights ? (es ? `${understood.nights} noche${understood.nights === 1 ? '' : 's'}` : `${understood.nights} night${understood.nights === 1 ? '' : 's'}`) : '',
    ].filter(Boolean).join(es ? ' / ' : ' / ');
    lines.push(es ? `Duración: ${parts}` : `Trip length: ${parts}`);
  }
  if (understood.date) lines.push(es ? `Fecha: ${understood.date}` : `Date: ${understood.date}`);
  else if (understood.monthName) lines.push(es ? `Fecha: ${understood.monthName} (día por definir)` : `Date: ${understood.monthName} (exact day to be defined)`);
  if (!place && understood.regionLabel) lines.push(es ? `Región: ${understood.regionLabel}` : `Region: ${understood.regionLabel}`);
  if (budget) {
    const amount = budget.currency === 'USD' ? formatUsdReference(budget.amount) : `₡${Math.round(budget.amount).toLocaleString('en-US')}`;
    const per = budget.per === 'person' ? (es ? ' por persona' : ' per person') : (es ? ' total' : ' total');
    lines.push(es ? `Presupuesto: ${amount}${per}` : `Budget: ${amount}${per}`);
  }

  const operatorNote = es
    ? 'El operador todavía no está confirmado para esta experiencia. Antes de cualquier pago confirmamos por escrito operador, precio final y cupo para tu fecha.'
    : 'The operator for this experience is not confirmed yet. Before any payment we confirm the operator, final price and availability for your date in writing.';

  const waLines = es
    ? ['Hola, quiero cotizar esta experiencia:', ...lines.map(l => `• ${l}`)]
    : ['Hi, I would like a quote for this experience:', ...lines.map(l => `• ${l}`)];
  if (result.quote) waLines.push(es ? `• Referencia vista en la web: ${result.quote.line}` : `• Reference seen on the website: ${result.quote.line}`);
  waLines.push(es ? '¿Pueden confirmar operador, precio final y disponibilidad?' : 'Can you confirm the operator, final price and availability?');
  const whatsappMessage = waLines.join('\n');

  result.inquiryHandoff = {
    source: 'server',
    understood: lines,
    ...(tour ? { tourId: tour.id, tourTitle: understood.tourTitle } : {}),
    ...(result.quote ? { referenceLine: result.quote.line } : {}),
    operatorNote,
    whatsappMessage,
    whatsappUrl: directWhatsAppUrl(whatsappMessage),
  };
  return result;
}

/** Deterministic reply used when the AI model fails or is not configured. */
export function deterministicConciergeReply(u: ConciergeUnderstanding): string | undefined {
  if (!u.isConcreteInquiry || !u.inquiryHandoff) return undefined;
  const es = u.understood.language === 'es';
  const parts = [
    es ? '¡Pura Vida! Esto es lo que entendí de tu consulta:' : 'Pura Vida! Here is what I understood from your request:',
    ...u.inquiryHandoff.understood.map(l => `• ${l}`),
  ];
  if (u.quote) {
    parts.push(es ? `Precio de referencia: ${u.quote.line}.` : `Reference price: ${u.quote.line}.`);
    if (u.quote.withinBudget === false) {
      parts.push(es ? 'La referencia supera el presupuesto indicado; podemos buscar alternativas.' : 'The reference is above the budget you gave; we can look for alternatives.');
    }
  }
  if (u.suggestions?.length) {
    parts.push(es ? 'Ideas del catálogo para la zona:' : 'Catalog ideas for the area:');
    for (const s of u.suggestions) parts.push(`• ${s.title}${s.referenceLine ? ` — ${s.referenceLine}` : ''}`);
  }
  parts.push(u.inquiryHandoff.operatorNote);
  parts.push(es ? 'Usa el botón de WhatsApp para enviarnos estos datos y te respondemos con la confirmación por escrito.' : 'Use the WhatsApp button to send us these details and we will reply with a written confirmation.');
  return parts.join('\n');
}

const MONEY_RE = /(?:US\$|USD\s?|\$|₡|CRC\s?)\s?\d[\d.,]*|\d[\d.,]*\s?(?:USD|US\$|dólares|dolares|dollars|colones|CRC)\b/i;

/**
 * Un solo precio de referencia por respuesta: si el servidor tiene la referencia del catálogo
 * para la ficha consultada, las frases del modelo que citan montos se reemplazan por esa
 * única línea, marcada "referencia, sujeto a confirmación". Evita respuestas con dos precios
 * distintos para el mismo tour (p. ej. US$83/adulto y US$75 × 2).
 */
export function enforceSingleReferencePrice(reply: string, u: ConciergeUnderstanding | null | undefined): string {
  if (!reply || !u?.quote) return reply;
  const es = u.understood.language === 'es';
  const canonical = es ? `Precio de referencia: ${u.quote.line}.` : `Reference price: ${u.quote.line}.`;
  const lines = reply.split('\n').map(line => {
    if (!MONEY_RE.test(line)) return line;
    const kept = line.split(/(?<=[.!?])[ \t]+/).filter(sentence => !MONEY_RE.test(sentence)).join(' ').trim();
    return kept && !/^[-•*\s]*$/.test(kept) ? kept : null;
  }).filter((line): line is string => line !== null);
  const body = stripEmptyMarkdownTables(lines.join('\n')).replace(/\n{3,}/g, '\n\n').trim();
  return body ? `${body}\n\n${canonical}` : canonical;
}

const TABLE_LINE_RE = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR_RE = /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{0,}:?\s*\|?\s*$/;

/**
 * Elimina tablas markdown que quedaron sin filas de datos (solo encabezado y/o
 * separador), p. ej. tras quitar las filas con montos en enforceSingleReferencePrice.
 */
export function stripEmptyMarkdownTables(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length;) {
    if (!TABLE_LINE_RE.test(lines[i])) { out.push(lines[i]); i++; continue; }
    let j = i;
    while (j < lines.length && TABLE_LINE_RE.test(lines[j])) j++;
    const block = lines.slice(i, j);
    const sepIdx = block.findIndex(l => TABLE_SEPARATOR_RE.test(l));
    const dataRows = sepIdx >= 0 ? block.slice(sepIdx + 1).filter(l => !TABLE_SEPARATOR_RE.test(l)) : block;
    const isEmptyTable = sepIdx >= 0 && dataRows.length === 0;
    if (!isEmptyTable) out.push(...block);
    i = j;
  }
  return out.join('\n');
}
