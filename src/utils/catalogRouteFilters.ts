import { CATEGORIES, REGIONS } from '../data/catalogMeta';
import type { TourCategory, TourRegion } from '../types';

/** Route query is the source of truth while /tours is open. */
export type CatalogRouteFilters = {
  q: string;
  category: TourCategory | 'all';
  region: TourRegion | 'all';
  difficulty: 'all' | 'fácil' | 'moderado' | 'exigente';
  maxPrice: number;
  favorites: boolean;
};
export const DEFAULT_CATALOG_PRICE = 500;
const categoryIds = new Set(CATEGORIES.map(c => c.id));
const regionIds = new Set(REGIONS.map(r => r.id));
const difficulties = new Set(['fácil', 'moderado', 'exigente']);

export function readCatalogRouteFilters(params: URLSearchParams): CatalogRouteFilters {
  const rawCategory = params.get('category') || '';
  const rawRegion = params.get('region') || '';
  const rawDifficulty = params.get('difficulty') || '';
  const price = Number(params.get('maxPrice'));
  return {
    q: (params.get('q') || '').slice(0, 250),
    category: categoryIds.has(rawCategory as TourCategory) ? rawCategory as TourCategory : 'all',
    region: regionIds.has(rawRegion as TourRegion) ? rawRegion as TourRegion : 'all',
    difficulty: difficulties.has(rawDifficulty) ? rawDifficulty as CatalogRouteFilters['difficulty'] : 'all',
    maxPrice: Number.isFinite(price) && price > 0 && price < DEFAULT_CATALOG_PRICE ? price : DEFAULT_CATALOG_PRICE,
    favorites: params.get('favorites') === '1'
  };
}

/** Preserve unrelated query data, including favorites, on a single-filter edit. */
export function patchCatalogRouteFilters(params: URLSearchParams, changes: Partial<CatalogRouteFilters>) {
  const next = new URLSearchParams(params);
  if ('q' in changes) {
    // No recortar espacios aquí: se escribe en cada tecla y "Caño " perdería el espacio
    // antes de que el usuario escriba "Negro". El filtro normaliza al comparar.
    const value = (changes.q || '').slice(0, 250);
    if (value.trim()) next.set('q', value); else next.delete('q');
  }
  if ('category' in changes) {
    if (changes.category && changes.category !== 'all' && categoryIds.has(changes.category)) next.set('category', changes.category);
    else next.delete('category');
  }
  if ('region' in changes) {
    if (changes.region && changes.region !== 'all' && regionIds.has(changes.region)) next.set('region', changes.region);
    else next.delete('region');
  }
  if ('difficulty' in changes) {
    if (changes.difficulty && difficulties.has(changes.difficulty)) next.set('difficulty', changes.difficulty);
    else next.delete('difficulty');
  }
  if ('maxPrice' in changes) {
    const value = changes.maxPrice;
    if (typeof value === 'number' && Number.isFinite(value) && value > 0 && value < DEFAULT_CATALOG_PRICE) next.set('maxPrice', String(value));
    else next.delete('maxPrice');
  }
  if ('favorites' in changes) {
    if (changes.favorites === true) next.set('favorites', '1'); else next.delete('favorites');
  }
  return next;
}

export function catalogSearchHref(changes: Partial<CatalogRouteFilters>) {
  const params = patchCatalogRouteFilters(new URLSearchParams(), changes);
  return '/tours' + (params.toString() ? '?' + params.toString() : '');
}
