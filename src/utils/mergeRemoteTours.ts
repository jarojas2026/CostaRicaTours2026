import type { Tour } from '../types';

/**
 * Enriches Firestore tours with the local catalog. Match backend lookup by
 * explicit remote identity; title matches only enrich presentation and must
 * never select a different sale product.
 */
export interface RemoteTourDoc {
  tour: Tour;
  docId: string;
}

export function mergeRemoteTours(remoteDocs: readonly RemoteTourDoc[], localTours: readonly Tour[]): Tour[] {
  const merged = remoteDocs
    .map(({ tour: remoteTour, docId }) => {
      const canBook = remoteTour.catalogStatus === 'bookable' && Boolean(remoteTour.providerId?.trim());
      const localTour = localTours.find((tour) =>
        tour.id === remoteTour.id ||
        tour.title.es === remoteTour.title?.es ||
        tour.title.en === remoteTour.title?.en
      );
      return {
        ...(localTour || {} as Tour),
        ...remoteTour,
        id: remoteTour.id || docId,
        catalogStatus: canBook ? 'bookable' : 'inquiry',
        isDemoData: !canBook
      } satisfies Tour;
    })
    .sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  // Firestore solo guarda los tours curados; los tours de operadores (consulta) viven en el
  // catálogo local y antes desaparecían en cuanto Firestore respondía. Se agregan los que
  // no tengan equivalente remoto (mismo id o mismo título).
  const remoteIds = new Set(merged.map((tour) => tour.id));
  const remoteTitles = new Set(merged.flatMap((tour) => [tour.title?.es, tour.title?.en]).filter(Boolean));
  const localOnly = localTours.filter((tour) =>
    !remoteIds.has(tour.id) && !remoteTitles.has(tour.title.es) && !remoteTitles.has(tour.title.en)
  );
  return [...merged, ...localOnly];
}
