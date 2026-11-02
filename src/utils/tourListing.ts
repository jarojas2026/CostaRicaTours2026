import { Tour } from '../types';

/** Only explicitly onboarded offers may display as priced/bookable products. */
export function isBookableTour(tour: Pick<Tour, 'catalogStatus' | 'providerId'>): boolean {
  return tour.catalogStatus === 'bookable' && Boolean(tour.providerId?.trim());
}

export function normalizeCatalogSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();
}

const GENERIC_CATALOG_TERMS = new Set([
  'tour', 'tours', 'experiencia', 'experiencias', 'experience', 'experiences',
  'actividad', 'actividades', 'activity', 'activities', 'costa', 'rica',
  'thing', 'things', 'hacer', 'todo', 'todos', 'all', 'best', 'mejor',
  'in', 'en', 'de', 'the', 'for', 'para', 'y', 'and'
]);

/** Generic catalog requests (e.g. "tours Costa Rica") do not narrow results. */
export function catalogSearchTerms(query: string): string[] {
  return normalizeCatalogSearch(query).split(/\s+/).filter(Boolean).filter(term => !GENERIC_CATALOG_TERMS.has(term));
}

export function isGenericCatalogSearch(query: string): boolean {
  return query.trim().length > 0 && catalogSearchTerms(query).length === 0;
}

function flattenCatalogValue(value: unknown): string[] {
  if (typeof value === 'string' || typeof value === 'number') return [String(value)];
  if (Array.isArray(value)) return value.flatMap(flattenCatalogValue);
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).flatMap(flattenCatalogValue);
  return [];
}

function tourSearchSynonyms(tour: Tour): string {
  const region: Record<string, string> = {
    sarapiqui: 'sarapiquí northern plains llanuras del norte rio river bote boat aves birding canopy rafting',
    central_pacific: 'pacifico central central pacific tarcoles carara damas manglar mangrove kayak',
    los_santos: 'dota san gerardo quetzal aves birdwatching hiking senderismo',
    golfito: 'golfo dulce gulf osa puerto jimenez pavones zancudo whale dolphin pesca fishing',
    golfo_dulce: 'golfito osa puerto jimenez pavones zancudo whale dolphin pesca fishing',
    osa: 'uvita ballena dominical corcovado caño drake bay golfito whale watching',
    caribe: 'caribbean puerto viejo cahuita limon afrocaribeño afro caribbean',
    caribe_sur: 'caribbean puerto viejo cahuita limon afrocaribeño afro caribbean',
    sjo: 'san jose san josé valle central central valley cartago poas poás irazu',
    san_jose: 'san jose san josé valle central central valley cartago poas poás irazu'
  };
  const category: Record<string, string> = {
    wildlife: 'fauna animales vida silvestre naturaleza animal spotting',
    beaches: 'playa costa beach ocean snorkeling surf mar',
    culture: 'cultura café cafe coffee cacao chocolate community historia heritage',
    canopy: 'zipline tirolesa aventura adventure',
    rafting: 'whitewater aguas bravas rio river'
  };
  return [region[tour.region], category[tour.category]].filter(Boolean).join(' ');
}

/** Relevance tier: title > category/region/highlights > descriptive copy. */
export function catalogTourSearchScore(tour: Tour, query: string): number {
  const terms = catalogSearchTerms(query);
  if (!terms.length) return 0;
  const title = normalizeCatalogSearch(flattenCatalogValue(tour.title).join(' '));
  const metadata = normalizeCatalogSearch([
    tour.category, tour.region, tour.location?.placeName,
    ...flattenCatalogValue(tour.highlights), ...flattenCatalogValue(tour.inclusions),
    tourSearchSynonyms(tour)
  ].join(' '));
  const description = normalizeCatalogSearch([
    ...flattenCatalogValue(tour.subtitle), ...flattenCatalogValue(tour.description)
  ].join(' '));
  const matchesAll = (text: string) => terms.every(term => text.includes(term));
  if (matchesAll(title)) return title === normalizeCatalogSearch(query) ? 120 : 100;
  if (matchesAll(metadata)) return 60;
  if (matchesAll(description)) return 25;
  const all = normalizeCatalogSearch([title, metadata, description].join(' '));
  return matchesAll(all) ? 10 : 0;
}
