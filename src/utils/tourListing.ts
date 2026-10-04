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
