/**
 * Siembra data/internal/*.json en Firestore privado (colecciones de
 * backend/internalDataStore.ts). Idempotente: compara con lo que ya existe y solo
 * escribe documentos nuevos o cambiados.
 *
 * Uso:
 *   npx tsx scripts/internal/seed-internal-to-firestore.ts            # dry-run (no escribe)
 *   npx tsx scripts/internal/seed-internal-to-firestore.ts --write    # escribe
 *   ... --write --prune   # además borra tours internos que ya no están en el JSON
 *
 * Credenciales: Application Default Credentials (`gcloud auth application-default login`)
 * y FIREBASE_PROJECT_ID / GOOGLE_CLOUD_PROJECT; usa la misma base nombrada que el backend.
 * El script nunca imprime nombres, correos ni teléfonos: solo ids y conteos.
 */
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  INTERNAL_COLLECTION,
  INTERNAL_DOC_IDS,
  INTERNAL_TOURS_COLLECTION,
  loadInternalDataFromLocalSync,
} from '../../backend/internalDataStore';

export interface SeedDoc { collection: string; id: string; data: Record<string, unknown> }
export interface SeedPlan { upserts: SeedDoc[]; unchanged: number; deletes: Array<{ collection: string; id: string }> }

/** Interfaz mínima de Firestore usada (mockeable). */
export interface SeedFirestore {
  collection(name: string): {
    doc(id: string): { get(): Promise<{ exists: boolean; data(): any }> };
    get(): Promise<{ docs: Array<{ id: string; data(): any }> }>;
  };
  batch(): { set(ref: any, data: any): void; delete(ref: any): void; commit(): Promise<unknown> };
}

const stable = (v: unknown): string => JSON.stringify(sortKeys(v));
function sortKeys(v: any): any {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  return v;
}
export const contentHash = (v: unknown) => crypto.createHash('sha256').update(stable(v)).digest('hex');

export function buildSeedDocs(root = process.cwd()): SeedDoc[] {
  const local = loadInternalDataFromLocalSync(root);
  if (!local) throw new Error('No hay data/internal/*.json para sembrar.');
  const priceCheckedAt = local.tourSources[0]?.priceCheckedAt || null;
  return [
    { collection: INTERNAL_COLLECTION, id: INTERNAL_DOC_IDS.denylist, data: { ...local.denylist } },
    { collection: INTERNAL_COLLECTION, id: INTERNAL_DOC_IDS.legacyTourIds, data: { entries: local.legacyTourIds } },
    { collection: INTERNAL_COLLECTION, id: INTERNAL_DOC_IDS.legacyCuratedTourIds, data: { entries: local.legacyCuratedTourIds } },
    { collection: INTERNAL_COLLECTION, id: INTERNAL_DOC_IDS.operatorProfiles, data: { operators: local.operatorProfiles.operators } },
    {
      collection: INTERNAL_COLLECTION,
      id: INTERNAL_DOC_IDS.tourSourcesMeta,
      data: { priceCheckedAt, count: local.tourSources.length, contentHash: contentHash(local.tourSources) },
    },
    ...local.tourSources.map((row) => ({ collection: INTERNAL_TOURS_COLLECTION, id: row.id, data: { ...row } as Record<string, unknown> })),
  ];
}

export async function planSeed(db: SeedFirestore, docs: SeedDoc[], { prune = false } = {}): Promise<SeedPlan> {
  const plan: SeedPlan = { upserts: [], unchanged: 0, deletes: [] };
  const existingTours = await db.collection(INTERNAL_TOURS_COLLECTION).get();
  const existingById = new Map(existingTours.docs.map((d) => [d.id, d.data()]));
  for (const doc of docs) {
    const current = doc.collection === INTERNAL_TOURS_COLLECTION
      ? existingById.get(doc.id)
      : await db.collection(doc.collection).doc(doc.id).get().then((s) => (s.exists ? s.data() : undefined));
    if (current !== undefined && stable(current) === stable(doc.data)) plan.unchanged += 1;
    else plan.upserts.push(doc);
  }
  if (prune) {
    const wanted = new Set(docs.filter((d) => d.collection === INTERNAL_TOURS_COLLECTION).map((d) => d.id));
    for (const id of existingById.keys()) if (!wanted.has(id)) plan.deletes.push({ collection: INTERNAL_TOURS_COLLECTION, id });
  }
  return plan;
}

export async function applySeed(db: SeedFirestore, plan: SeedPlan, batchSize = 400): Promise<number> {
  const ops = [
    ...plan.upserts.map((d) => ({ kind: 'set' as const, d })),
    ...plan.deletes.map((d) => ({ kind: 'delete' as const, d })),
  ];
  for (let i = 0; i < ops.length; i += batchSize) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + batchSize)) {
      const ref = db.collection(op.d.collection).doc(op.d.id);
      if (op.kind === 'set') batch.set(ref, (op.d as SeedDoc).data);
      else batch.delete(ref);
    }
    await batch.commit();
  }
  return ops.length;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const write = args.has('--write');
  const prune = args.has('--prune');
  // El backend solo abre Firestore fuera del modo de test offline.
  const { getFirestoreDb } = await import('../../backend/bookingService');
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore Admin no disponible (revisa ADC y FIREBASE_PROJECT_ID).');
  const docs = buildSeedDocs();
  const plan = await planSeed(db as unknown as SeedFirestore, docs, { prune });
  console.log(`Modo: ${write ? 'ESCRITURA' : 'dry-run (usa --write para escribir)'}`);
  console.log(`Documentos: ${docs.length} · sin cambios: ${plan.unchanged} · a escribir: ${plan.upserts.length} · a borrar: ${plan.deletes.length}`);
  for (const d of plan.upserts.slice(0, 20)) console.log(`  set ${d.collection}/${d.id}`);
  if (plan.upserts.length > 20) console.log(`  … y ${plan.upserts.length - 20} más`);
  for (const d of plan.deletes.slice(0, 20)) console.log(`  delete ${d.collection}/${d.id}`);
  if (!write) return;
  const n = await applySeed(db as unknown as SeedFirestore, plan);
  console.log(`✓ ${n} operaciones aplicadas.`);
}

type Terminable = { terminate?: () => Promise<unknown> } | null | undefined;

/**
 * Ejecuta el CLI y termina el proceso al acabar. Firestore Admin (y otros módulos del
 * backend) dejan el event loop abierto, así que sin esto el script queda colgado tras
 * imprimir el resumen. Cierra Firestore con un tope de tiempo y sale con 0 o 1.
 */
export async function runCli(
  run: () => Promise<void>,
  deps: { getDb: () => Promise<Terminable>; exit: (code: number) => void; log?: (msg: string) => void; terminateTimeoutMs?: number },
): Promise<number> {
  let code = 0;
  try {
    await run();
  } catch (err: any) {
    (deps.log || console.error)(`✖ ${err?.message || err}`);
    code = 1;
  }
  try {
    const db = await deps.getDb();
    if (db?.terminate) {
      await Promise.race([
        db.terminate(),
        new Promise((resolve) => setTimeout(resolve, deps.terminateTimeoutMs ?? 5000)),
      ]);
    }
  } catch { /* cerrar es best-effort: salimos igual */ }
  deps.exit(code);
  return code;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  void runCli(main, {
    getDb: async () => {
      const { getFirestoreDb } = await import('../../backend/bookingService');
      return getFirestoreDb() as unknown as Terminable;
    },
    exit: (code) => process.exit(code),
  });
}
