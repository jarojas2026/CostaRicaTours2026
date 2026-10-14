import type { Language } from '../types';
import { referenceTotalLine, formatUsdReference } from './referencePrice';
import { directWhatsAppUrl } from './directWhatsApp';

/**
 * Lightweight, deterministic extraction of the parameters a traveller gives in
 * a free-text inquiry ("rafting Pacuare 2 personas diciembre ¿cuánto cuesta?").
 * It runs in the browser so the assistant UI can always acknowledge the
 * request and offer a WhatsApp hand-off with full context, whatever the
 * server-side model replies.
 */

export interface ParsedTripRequest {
  activity?: string; // canonical activity key, e.g. 'rafting'
  place?: string; // canonical place key, e.g. 'pacuare'
  people?: number;
  month?: number; // 1-12
  asksPrice: boolean;
}

export interface CatalogTourLike {
  id: string;
  title: { es?: string; en?: string } | string;
  category: string;
  region: string;
  priceUSD: number;
  catalogStatus?: string;
  providerId?: string;
}

export interface TripInquiryHandoff {
  parsed: ParsedTripRequest;
  /** Bullet lines acknowledging what we understood. */
  understood: string[];
  tourId?: string;
  tourTitle?: string;
  referenceLine?: string;
  operatorNote: string;
  whatsappUrl: string;
  whatsappMessage: string;
}

const normalize = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const MONTHS: Array<{ month: number; patterns: RegExp }> = [
  { month: 1, patterns: /\b(enero|january|jan)\b/ },
  { month: 2, patterns: /\b(febrero|february|feb)\b/ },
  { month: 3, patterns: /\b(marzo|march)\b/ },
  { month: 4, patterns: /\b(abril|april)\b/ },
  { month: 5, patterns: /\b(mayo|may)\b/ },
  { month: 6, patterns: /\b(junio|june)\b/ },
  { month: 7, patterns: /\b(julio|july)\b/ },
  { month: 8, patterns: /\b(agosto|august)\b/ },
  { month: 9, patterns: /\b(septiembre|setiembre|september|sept)\b/ },
  { month: 10, patterns: /\b(octubre|october)\b/ },
  { month: 11, patterns: /\b(noviembre|november)\b/ },
  { month: 12, patterns: /\b(diciembre|december|dec)\b/ },
];

const MONTH_NAMES: Record<'es' | 'en', string[]> = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const ACTIVITIES: Array<{ key: string; category: string; pattern: RegExp; label: { es: string; en: string } }> = [
  { key: 'rafting', category: 'rafting', pattern: /\b(rafting|raft|balsa|rapidos|white ?water)\b/, label: { es: 'rafting', en: 'rafting' } },
  { key: 'whale_watching', category: 'whale_watching', pattern: /\b(ballenas?|whales?|whale watching)\b/, label: { es: 'avistamiento de ballenas', en: 'whale watching' } },
  { key: 'canopy', category: 'canopy', pattern: /\b(canopy|zip ?line|tirolesa|tirolina)\b/, label: { es: 'canopy', en: 'zipline' } },
  { key: 'volcanoes', category: 'volcanoes', pattern: /\b(volcan|volcano|termales|hot springs)\b/, label: { es: 'volcán / termales', en: 'volcano / hot springs' } },
  { key: 'wildlife', category: 'wildlife', pattern: /\b(perezosos?|sloths?|fauna|wildlife|tortugas?|turtles?)\b/, label: { es: 'fauna', en: 'wildlife' } },
];

const PLACES: Array<{ key: string; pattern: RegExp; label: string }> = [
  { key: 'pacuare', pattern: /\bpacuare\b/, label: 'Pacuare' },
  { key: 'sarapiqui', pattern: /\bsarapiqui\b/, label: 'Sarapiquí' },
  { key: 'arenal', pattern: /\b(arenal|la fortuna)\b/, label: 'Arenal' },
  { key: 'monteverde', pattern: /\bmonteverde\b/, label: 'Monteverde' },
  { key: 'manuel_antonio', pattern: /\bmanuel antonio\b/, label: 'Manuel Antonio' },
  { key: 'tortuguero', pattern: /\btortuguero\b/, label: 'Tortuguero' },
  { key: 'uvita', pattern: /\b(uvita|marino ballena)\b/, label: 'Uvita / Marino Ballena' },
  { key: 'guanacaste', pattern: /\b(guanacaste|tamarindo)\b/, label: 'Guanacaste' },
];

const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, one: 1, dos: 2, two: 2, tres: 3, three: 3, cuatro: 4, four: 4,
  cinco: 5, five: 5, seis: 6, six: 6, siete: 7, seven: 7, ocho: 8, eight: 8,
};

function parsePeople(text: string): number | undefined {
  const digit = text.match(/\b(\d{1,2})\s*(personas?|pax|adultos?|people|persons?|adults?|travell?ers|viajeros?)\b/)
    || text.match(/\bpara\s+(\d{1,2})\b/) || text.match(/\bfor\s+(\d{1,2})\b/);
  if (digit) {
    const n = Number(digit[1]);
    return n > 0 && n < 100 ? n : undefined;
  }
  const word = text.match(/\b(un|una|uno|one|dos|two|tres|three|cuatro|four|cinco|five|seis|six|siete|seven|ocho|eight)\s*(personas?|adultos?|people|persons?|adults?|viajeros?)\b/)
    || text.match(/\bpara\s+(dos|tres|cuatro|cinco|seis|siete|ocho)\b/) || text.match(/\bfor\s+(two|three|four|five|six|seven|eight)\b/);
  if (word) return NUMBER_WORDS[word[1]];
  if (/\b(pareja|couple)\b/.test(text)) return 2;
  return undefined;
}

export function parseTripRequest(input: string): ParsedTripRequest {
  const text = normalize(input);
  const activity = ACTIVITIES.find(item => item.pattern.test(text));
  const place = PLACES.find(item => item.pattern.test(text));
  const month = MONTHS.find(item => item.patterns.test(text));
  return {
    activity: activity?.key,
    place: place?.key,
    people: parsePeople(text),
    month: month?.month,
    asksPrice: /(cuanto (cuesta|vale|sale|es)|precio|tarifa|costo|how much|price|cost|rate|quote|cotiza)/.test(text),
  };
}

function tourTitle(tour: CatalogTourLike, language: Language): string {
  if (typeof tour.title === 'string') return tour.title;
  return (language === 'es' ? tour.title.es : tour.title.en) || tour.title.es || tour.title.en || tour.id;
}

/** Picks the catalog tour that matches activity + place; never guesses across activities. */
export function matchCatalogTour<T extends CatalogTourLike>(parsed: ParsedTripRequest, tours: T[]): T | undefined {
  const activity = ACTIVITIES.find(item => item.key === parsed.activity);
  const candidates = activity ? tours.filter(tour => tour.category === activity.category) : [];
  if (!parsed.place) return candidates.length === 1 ? candidates[0] : undefined;
  const placeKey = parsed.place;
  const byPlace = (activity ? candidates : tours).filter(tour => {
    const haystack = normalize(`${tour.id} ${tour.region} ${typeof tour.title === 'string' ? tour.title : `${tour.title.es || ''} ${tour.title.en || ''}`}`);
    return haystack.includes(placeKey.replace('_', ' ')) || haystack.includes(placeKey);
  });
  return byPlace[0];
}

/**
 * Builds the acknowledgement + WhatsApp hand-off for an inquiry. Returns
 * undefined when the message is not a concrete trip request.
 */
export function buildTripInquiryHandoff<T extends CatalogTourLike>(
  input: string,
  language: Language,
  tours: T[],
): TripInquiryHandoff | undefined {
  const parsed = parseTripRequest(input);
  const hasSubject = Boolean(parsed.activity || parsed.place);
  const hasDetail = parsed.asksPrice || parsed.people !== undefined || parsed.month !== undefined;
  if (!hasSubject || !hasDetail) return undefined;

  const es = language === 'es';
  const activity = ACTIVITIES.find(item => item.key === parsed.activity);
  const place = PLACES.find(item => item.key === parsed.place);
  const tour = matchCatalogTour(parsed, tours);
  const title = tour ? tourTitle(tour, language) : undefined;
  const monthName = parsed.month ? MONTH_NAMES[es ? 'es' : 'en'][parsed.month - 1] : undefined;

  const understood: string[] = [];
  const what = [activity ? activity.label[es ? 'es' : 'en'] : undefined, place?.label].filter(Boolean).join(es ? ' en ' : ' in ');
  if (what) understood.push(es ? `Experiencia: ${what}` : `Experience: ${what}`);
  if (parsed.people) understood.push(es ? `Personas: ${parsed.people}` : `People: ${parsed.people}`);
  if (monthName) understood.push(es ? `Fecha: ${monthName} (día por definir)` : `Date: ${monthName} (exact day to be defined)`);
  if (title) understood.push(es ? `Ficha de catálogo: ${title}` : `Catalog listing: ${title}`);

  const hasReference = Boolean(tour && tour.priceUSD > 0);
  const referenceLine = hasReference && tour
    ? (parsed.people && parsed.people > 0
      ? referenceTotalLine(tour.priceUSD, parsed.people, language)
      : (es
        ? `${formatUsdReference(tour.priceUSD)} por persona (referencia, sujeto a confirmación)`
        : `${formatUsdReference(tour.priceUSD)} per person (reference, subject to confirmation)`))
    : undefined;

  const operatorNote = es
    ? 'El operador todavía no está confirmado para esta experiencia. Antes de cualquier pago confirmamos por escrito operador, precio final y cupo para tu fecha.'
    : 'The operator for this experience is not confirmed yet. Before any payment we confirm the operator, final price and availability for your date in writing.';

  const lines = es
    ? ['Hola, quiero cotizar esta experiencia:', ...understood.map(line => `• ${line}`)]
    : ['Hi, I would like a quote for this experience:', ...understood.map(line => `• ${line}`)];
  if (referenceLine) lines.push(es ? `• Referencia vista en la web: ${referenceLine}` : `• Reference seen on the website: ${referenceLine}`);
  lines.push(es ? '¿Pueden confirmar operador, precio final y disponibilidad?' : 'Can you confirm the operator, final price and availability?');
  const whatsappMessage = lines.join('\n');

  return {
    parsed,
    understood,
    tourId: tour?.id,
    tourTitle: title,
    referenceLine,
    operatorNote,
    whatsappMessage,
    whatsappUrl: directWhatsAppUrl(whatsappMessage),
  };
}
