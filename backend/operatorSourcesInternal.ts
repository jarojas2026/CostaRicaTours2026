/**
 * SOLO SERVIDOR. Identidad, fuente y contactos de los operadores de cada tour público.
 *
 * Decisión del negocio: el cliente no ve datos del proveedor antes de reservar. El
 * catálogo público (src/data/catalogTours.json) no los contiene; este módulo los une
 * por id para asignar leads a operadores y para el panel /admin (protegido).
 * Nunca devolver estos datos desde endpoints públicos ni importarlo desde src/.
 */
import sources from '../data/internal/operatorTourSources.json';
import legacyOperatorIds from '../data/internal/legacyTourIds.json';
import legacyCuratedIds from '../data/internal/legacyCuratedTourIds.json';

export interface OperatorTourSource {
  id: string;
  legacyId: string;
  operatorName: string;
  sourceUrl: string;
  priceSource: 'publicado_por_operador';
  priceCheckedAt: string;
  publicTitleEs: string;
  originalTitleEs: string;
  originalPlaceName: string;
  notes: string | null;
  contacts: { prospectId: string | null; website: string | null; email: string | null; phoneWhatsapp: string | null };
  ictVerified: boolean;
}

const ROWS = (sources as { tours: OperatorTourSource[] }).tours;
const BY_ID = new Map(ROWS.map((row) => [row.id, row]));
const LEGACY: Record<string, string> = { ...(legacyOperatorIds as Record<string, string>), ...(legacyCuratedIds as Record<string, string>) };

/** Id público vigente para un id antiguo (con nombre de operador) o el mismo id. */
export function currentTourId(id: string): string {
  return LEGACY[id] || id;
}

export function operatorSourceForTour(tourId: string | undefined): OperatorTourSource | undefined {
  if (!tourId) return undefined;
  return BY_ID.get(currentTourId(tourId));
}

export function allOperatorTourSources(): readonly OperatorTourSource[] {
  return ROWS;
}
