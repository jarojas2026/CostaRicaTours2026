/**
 * SOLO SERVIDOR. Almacén de datos confidenciales de operadores.
 *
 * Producción (NODE_ENV=production): lee Firestore privado con el cliente Admin
 * (getFirestoreDb). Las reglas de firestore.rules niegan todo acceso de cliente a
 * estas colecciones (regla por defecto `allow read, write: if false`).
 *   - internal_operators/denylist                 { names, domains, publicPlaceNames }
 *   - internal_operators/legacy_tour_ids          { entries: { idAntiguo: idPublico } }
 *   - internal_operators/legacy_curated_tour_ids  { entries: { idAntiguo: idPublico } }
 *   - internal_operators/operator_profiles        { operators: [...] }
 *   - internal_operators/tour_sources_meta        { priceCheckedAt, count, contentHash }
 *   - internal_operator_tours/{tourId}            OperatorTourSource
 * La siembra la hace scripts/internal/seed-internal-to-firestore.ts (dry-run por defecto).
 *
 * Fuera de producción: respaldo con los JSON locales de data/internal/ solo si existen.
 *
 * Caché en memoria con TTL. Las lecturas síncronas (`peekInternalData`) devuelven la
 * última instantánea y disparan una recarga en segundo plano cuando venció. El
 * servidor llama `warmInternalDataStore()` antes de escuchar.
 *
 * Nunca devolver estos datos desde endpoints públicos ni importar este módulo desde src/.
 */
import fs from 'node:fs';
import path from 'node:path';

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

export interface OperatorDenylist {
  names: string[];
  domains: string[];
  publicPlaceNames?: string[];
}

export interface InternalDataSnapshot {
  tourSources: OperatorTourSource[];
  legacyTourIds: Record<string, string>;
  legacyCuratedTourIds: Record<string, string>;
  denylist: OperatorDenylist;
  operatorProfiles: { operators: unknown[] };
  source: 'firestore' | 'local' | 'empty';
  loadedAt: number;
}

export type InternalDataLoader = () => Promise<Omit<InternalDataSnapshot, 'source' | 'loadedAt'> | null>;

/** Interfaz mínima de Firestore que usa el store (facilita mocks en tests). */
export interface MinimalFirestore {
  collection(name: string): {
    doc(id: string): { get(): Promise<{ exists: boolean; data(): any }> };
    get(): Promise<{ docs: Array<{ id: string; data(): any }> }>;
  };
}

export const INTERNAL_COLLECTION = 'internal_operators';
export const INTERNAL_TOURS_COLLECTION = 'internal_operator_tours';
export const INTERNAL_DOC_IDS = {
  denylist: 'denylist',
  legacyTourIds: 'legacy_tour_ids',
  legacyCuratedTourIds: 'legacy_curated_tour_ids',
  operatorProfiles: 'operator_profiles',
  tourSourcesMeta: 'tour_sources_meta',
} as const;

const DEFAULT_TTL_MS = 10 * 60 * 1000;

export function emptySnapshot(now = Date.now()): InternalDataSnapshot {
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

/** Lee Firestore. Devuelve null si la colección no está sembrada. */
export async function loadInternalDataFromFirestore(db: MinimalFirestore): Promise<Omit<InternalDataSnapshot, 'source' | 'loadedAt'> | null> {
  const col = db.collection(INTERNAL_COLLECTION);
  const [deny, legacy, curated, profiles, tours] = await Promise.all([
    col.doc(INTERNAL_DOC_IDS.denylist).get(),
    col.doc(INTERNAL_DOC_IDS.legacyTourIds).get(),
    col.doc(INTERNAL_DOC_IDS.legacyCuratedTourIds).get(),
    col.doc(INTERNAL_DOC_IDS.operatorProfiles).get(),
    db.collection(INTERNAL_TOURS_COLLECTION).get(),
  ]);
  if (!deny.exists && tours.docs.length === 0) return null;
  const d = deny.exists ? deny.data() || {} : {};
  return {
    denylist: { names: arr(d.names), domains: arr(d.domains), publicPlaceNames: arr(d.publicPlaceNames) },
    legacyTourIds: legacy.exists ? map(legacy.data()?.entries) : {},
    legacyCuratedTourIds: curated.exists ? map(curated.data()?.entries) : {},
    operatorProfiles: { operators: profiles.exists ? arr(profiles.data()?.operators) : [] },
    tourSources: tours.docs.map((doc) => ({ ...(doc.data() as OperatorTourSource), id: doc.data()?.id || doc.id })),
  };
}

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const map = (v: unknown): Record<string, string> => (v && typeof v === 'object' ? { ...(v as Record<string, string>) } : {});

/** Lee data/internal/*.json si existen (solo fuera de producción). */
export function loadInternalDataFromLocalSync(root = process.cwd()): Omit<InternalDataSnapshot, 'source' | 'loadedAt'> | null {
  const dir = path.join(root, 'data', 'internal');
  const read = (file: string): any => {
    const full = path.join(dir, file);
    return fs.existsSync(full) ? JSON.parse(fs.readFileSync(full, 'utf8')) : null;
  };
  const sources = read('operatorTourSources.json');
  const deny = read('operatorDenylist.json');
  if (!sources && !deny) return null;
  return {
    tourSources: arr(sources?.tours),
    legacyTourIds: map(read('legacyTourIds.json')),
    legacyCuratedTourIds: map(read('legacyCuratedTourIds.json')),
    denylist: { names: arr(deny?.names), domains: arr(deny?.domains), publicPlaceNames: arr(deny?.publicPlaceNames) },
    operatorProfiles: { operators: arr(read('operatorProfiles.json')?.operators) },
  };
}

export interface InternalDataStoreOptions {
  isProduction?: () => boolean;
  /** Lector de Firestore (inyectable en tests). */
  loadFirestore?: InternalDataLoader;
  /** Lector local síncrono (inyectable en tests). */
  loadLocal?: () => Omit<InternalDataSnapshot, 'source' | 'loadedAt'> | null;
  ttlMs?: number;
  now?: () => number;
  logger?: Pick<Console, 'warn' | 'error'>;
}

export function createInternalDataStore(options: InternalDataStoreOptions = {}) {
  const isProduction = options.isProduction ?? (() => process.env.NODE_ENV === 'production');
  const now = options.now ?? (() => Date.now());
  const ttlMs = options.ttlMs ?? (Number(process.env.INTERNAL_DATA_CACHE_TTL_MS) || DEFAULT_TTL_MS);
  const logger = options.logger ?? console;
  const loadLocal = options.loadLocal ?? (() => loadInternalDataFromLocalSync());
  const loadFirestore: InternalDataLoader = options.loadFirestore ?? (async () => {
    const { getFirestoreDb } = await import('./bookingService');
    const db = getFirestoreDb();
    if (!db) return null;
    return loadInternalDataFromFirestore(db as unknown as MinimalFirestore);
  });

  let cache: InternalDataSnapshot | null = null;
  let inflight: Promise<InternalDataSnapshot> | null = null;

  const fresh = () => Boolean(cache && now() - cache.loadedAt < ttlMs);

  function localSnapshot(): InternalDataSnapshot {
    const local = loadLocal();
    return local ? { ...local, source: 'local', loadedAt: now() } : emptySnapshot(now());
  }

  async function load(): Promise<InternalDataSnapshot> {
    if (!isProduction()) return localSnapshot();
    try {
      const data = await loadFirestore();
      if (data) return { ...data, source: 'firestore', loadedAt: now() };
      logger.error('[internalDataStore] Firestore sin datos internos (¿falta sembrar internal_operators?).');
    } catch (error: any) {
      logger.error('[internalDataStore] Error leyendo Firestore:', error?.message || String(error));
    }
    // Conserva la última instantánea buena si existe; si no, vacío (nunca JSON local en producción).
    return cache && cache.source === 'firestore' ? { ...cache, loadedAt: now() } : emptySnapshot(now());
  }

  function refresh(): Promise<InternalDataSnapshot> {
    if (!inflight) {
      inflight = load().then((snap) => { cache = snap; return snap; }).finally(() => { inflight = null; });
    }
    return inflight;
  }

  return {
    /** Lectura asíncrona: usa caché vigente o recarga. */
    async get(): Promise<InternalDataSnapshot> {
      if (fresh()) return cache!;
      return refresh();
    },
    /**
     * Lectura síncrona para consumidores existentes. Fuera de producción carga el
     * respaldo local al instante. En producción devuelve la última instantánea
     * (vacía si aún no se calentó) y recarga en segundo plano si venció.
     */
    peek(): InternalDataSnapshot {
      if (!cache && !isProduction()) cache = localSnapshot();
      if (!fresh()) refresh().catch(() => undefined);
      return cache ?? emptySnapshot(now());
    },
    warm(): Promise<InternalDataSnapshot> { return refresh(); },
    clear(): void { cache = null; inflight = null; },
  };
}

export type InternalDataStore = ReturnType<typeof createInternalDataStore>;

let defaultStore: InternalDataStore = createInternalDataStore();

export function getInternalDataStore(): InternalDataStore { return defaultStore; }
/** Solo tests. */
export function setInternalDataStoreForTests(store: InternalDataStore | null): void {
  defaultStore = store ?? createInternalDataStore();
}

export const getInternalData = () => defaultStore.get();
export const peekInternalData = () => defaultStore.peek();
export const warmInternalDataStore = () => defaultStore.warm();
