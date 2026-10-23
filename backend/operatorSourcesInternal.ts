/**
 * SOLO SERVIDOR. Identidad, fuente y contactos de los operadores de cada tour público.
 *
 * Decisión del negocio: el cliente no ve datos del proveedor antes de reservar. El
 * catálogo público (src/data/catalogTours.json) no los contiene; este módulo los une
 * por id para asignar leads a operadores y para el panel /admin (protegido).
 * Los datos vienen de backend/internalDataStore.ts (Firestore privado en producción;
 * data/internal/ como respaldo local fuera de producción).
 * Nunca devolver estos datos desde endpoints públicos ni importarlo desde src/.
 */
import { peekInternalData, type InternalDataSnapshot, type OperatorTourSource } from './internalDataStore';

export type { OperatorTourSource } from './internalDataStore';

let indexed: { snap: InternalDataSnapshot; byId: Map<string, OperatorTourSource>; legacy: Record<string, string> } | null = null;

function index() {
  const snap = peekInternalData();
  if (!indexed || indexed.snap !== snap) {
    indexed = {
      snap,
      byId: new Map(snap.tourSources.map((row) => [row.id, row])),
      legacy: { ...snap.legacyTourIds, ...snap.legacyCuratedTourIds },
    };
  }
  return indexed;
}

/** Id público vigente para un id antiguo (con nombre de operador) o el mismo id. */
export function currentTourId(id: string): string {
  return index().legacy[id] || id;
}

export function operatorSourceForTour(tourId: string | undefined): OperatorTourSource | undefined {
  if (!tourId) return undefined;
  return index().byId.get(currentTourId(tourId));
}

export function allOperatorTourSources(): readonly OperatorTourSource[] {
  return index().snap.tourSources;
}
