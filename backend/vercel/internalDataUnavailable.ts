/**
 * Sustituto del almacén de datos internos de operadores para el bundle público
 * de Vercel (`npm run build:concierge-runtime`).
 *
 * En producción ese almacén solo lee Firestore (nunca JSON local) y en Vercel
 * Firestore Admin está desactivado sin credencial, así que la instantánea real
 * siempre sería vacía. Este módulo lo hace explícito: ninguna función pública
 * de Vercel incluye ni puede leer datos internos de operadores.
 */
type EmptyInternalSnapshot = {
  tourSources: never[];
  legacyTourIds: Record<string, string>;
  legacyCuratedTourIds: Record<string, string>;
  denylist: { names: string[]; domains: string[]; publicPlaceNames: string[] };
  operatorProfiles: { operators: unknown[] };
  source: 'empty';
  loadedAt: number;
};

export function emptySnapshot(now = Date.now()): EmptyInternalSnapshot {
  return {
    tourSources: [],
    legacyTourIds: {},
    legacyCuratedTourIds: {},
    denylist: { names: [], domains: [], publicPlaceNames: [] },
    operatorProfiles: { operators: [] },
    source: 'empty',
    loadedAt: now,
  };
}

export const peekInternalData = () => emptySnapshot();
export const getInternalData = async () => emptySnapshot();
export const warmInternalDataStore = async () => emptySnapshot();
