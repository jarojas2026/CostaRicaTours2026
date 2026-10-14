import type { Tour } from '../types';

/**
 * Carga diferida y cacheada del catálogo local de tours.
 *
 * El módulo ./toursCatalog (~180 kB) se resuelve con import() en su propio
 * chunk, una sola vez por sesión; las llamadas concurrentes comparten la misma
 * promesa. Si la carga falla, la siguiente llamada reintenta.
 */
let cache: readonly Tour[] | null = null;
let pending: Promise<readonly Tour[]> | null = null;

export function loadTours(): Promise<readonly Tour[]> {
  if (cache) return Promise.resolve(cache);
  pending ??= import('./toursCatalog')
    .then(({ TOURS }) => {
      cache = TOURS;
      return TOURS;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** Devuelve el catálogo si ya se cargó (sin disparar la carga). */
export function peekTours(): readonly Tour[] | null {
  return cache;
}
