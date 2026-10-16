import type { Tour } from '../types';
import { publishedTourPrice } from './tourPublication';
import { isBookableTour } from './tourListing';

export type TourKind = 'curated' | 'operator';

export interface ResolvedTour {
  tour: Tour;
  kind: TourKind;
}

/** Ids válidos en la URL /tour/:id (mismo patrón que el prerender). */
export const TOUR_PATH_ID_RE = /^[a-zA-Z0-9_-]{1,120}$/;

/**
 * Resuelve el :id de /tour/:id contra el catálogo combinado (curados + tours
 * de operador). Acepta id o slug; devuelve null para ids inválidos o ausentes
 * (la página muestra el 404 interno).
 */
export function resolveTour(rawId: string | undefined, tours: readonly Tour[]): ResolvedTour | null {
  let id = String(rawId ?? '').trim();
  try { id = decodeURIComponent(id); } catch { return null; }
  if (!TOUR_PATH_ID_RE.test(id)) return null;
  const tour = tours.find(t => t.id === id) || tours.find(t => t.slug === id);
  if (!tour) return null;
  return { tour, kind: tour.catalogStatus === 'inquiry' && tour.priceSource === 'precio_referencia' ? 'operator' : 'curated' };
}

export interface TourPriceLabel {
  amountUSD?: number;
  label: { es: string; en: string };
}

/**
 * Precio que se puede mostrar en la ficha: solo el precio de referencia con
 * fecha de revisión; si no, "Consultar precio". Nunca se cita al proveedor.
 */
export function tourReferencePrice(tour: Tour): TourPriceLabel {
  const amountUSD = publishedTourPrice(tour);
  return amountUSD === undefined
    ? { label: { es: 'Consultar precio', en: 'Ask for price' } }
    : { amountUSD, label: { es: 'Precio de referencia, sujeto a confirmación', en: 'Reference price, subject to confirmation' } };
}

/** Estado comercial: nunca se afirma disponibilidad desde la ficha. */
export const TOUR_COMMERCIAL_STATUS = { es: 'Consultar disponibilidad', en: 'Check availability' } as const;

/** Los tours de consulta nunca muestran botón de pago. */
export function tourAllowsPayment(tour: Tour): boolean {
  return tour.catalogStatus !== 'inquiry' && isBookableTour(tour);
}

/** Fecha en que el equipo revisó el precio de referencia (sin enlaces al proveedor). */
export function tourReviewDate(tour: Tour): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(tour.priceCheckedAt || '') ? tour.priceCheckedAt : undefined;
}
