import type { Tour } from '../types';

export function publishedTourPrice(tour: Tour): number | undefined {
  return tour.priceSource === 'precio_referencia'
    && /^\d{4}-\d{2}-\d{2}$/.test(tour.priceCheckedAt || '')
    && Number.isFinite(tour.priceUSD) && tour.priceUSD > 0
    ? tour.priceUSD : undefined;
}

export function similarTours(tour: Tour, tours: readonly Tour[]): Tour[] {
  return tours.filter(t => t.id !== tour.id && (t.region === tour.region || t.category === tour.category))
    .sort((a, b) => Number(b.region === tour.region) - Number(a.region === tour.region))
    .slice(0, 3);
}
