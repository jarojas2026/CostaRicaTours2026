import { useEffect, useState } from 'react';
import type { Tour } from '../types';
import { loadTours, peekTours } from '../data/loadTours';

/**
 * Catálogo local de tours cargado bajo demanda (chunk diferido + caché).
 * Devuelve [] hasta que el chunk termina de cargar.
 */
export function useLocalTours(): readonly Tour[] {
  const [tours, setTours] = useState<readonly Tour[]>(() => peekTours() ?? []);
  useEffect(() => {
    if (tours.length > 0) return;
    let active = true;
    loadTours()
      .then((loaded) => { if (active) setTours(loaded); })
      .catch((error: unknown) => console.warn('No se pudo cargar el catálogo local de tours:', error));
    return () => { active = false; };
  }, [tours.length]);
  return tours;
}
