/**
 * Contrato del almacén de datos internos de operadores (backend/internalDataStore.ts):
 * carga desde Firestore (mock), caché con TTL, respaldo local solo fuera de producción,
 * siembra idempotente en dry-run y auditoría de privacidad sin data/internal/.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  createInternalDataStore,
  loadInternalDataFromFirestore,
  INTERNAL_COLLECTION,
  INTERNAL_TOURS_COLLECTION,
  type MinimalFirestore,
} from '../backend/internalDataStore';
import { buildSeedDocs, planSeed, applySeed, type SeedFirestore } from '../scripts/internal/seed-internal-to-firestore';
// @ts-ignore módulo .mjs con JSDoc
import { buildMatchers, hashMatchers, scanText, buildDenylistHashes, loadDenylist, loadDenylistHashes } from '../scripts/lib/operatorPrivacyScan.mjs';

const root = process.cwd();
const TOUR = {
  id: 'arenal-canyoning', legacyId: 'op-x-canyoning', operatorName: 'Operadora Ficticia', sourceUrl: 'https://ficticia.example',
  priceSource: 'publicado_por_operador', priceCheckedAt: '2026-10-01', publicTitleEs: 'Canyoning', originalTitleEs: 'Canyoning X',
  originalPlaceName: 'Arenal', notes: null, contacts: { prospectId: null, website: null, email: null, phoneWhatsapp: null }, ictVerified: false,
};

/** Firestore en memoria: { coleccion: { docId: data } }. Cuenta lecturas y escrituras. */
function fakeFirestore(seed: Record<string, Record<string, any>> = {}) {
  const data: Record<string, Record<string, any>> = JSON.parse(JSON.stringify(seed));
  const stats = { reads: 0, writes: 0, deletes: 0 };
  const db: SeedFirestore & MinimalFirestore = {
    collection(name: string) {
      const col = (data[name] ||= {});
      return {
        doc(id: string) {
          return {
            _col: name, _id: id,
            async get() { stats.reads++; return { exists: id in col, data: () => (id in col ? JSON.parse(JSON.stringify(col[id])) : undefined) }; },
          } as any;
        },
        async get() { stats.reads++; return { docs: Object.entries(col).map(([id, d]) => ({ id, data: () => JSON.parse(JSON.stringify(d)) })) }; },
      };
    },
    batch() {
      const ops: Array<() => void> = [];
      return {
        set(ref: any, d: any) { ops.push(() => { (data[ref._col] ||= {})[ref._id] = JSON.parse(JSON.stringify(d)); stats.writes++; }); },
        delete(ref: any) { ops.push(() => { delete (data[ref._col] ||= {})[ref._id]; stats.deletes++; }); },
        async commit() { ops.forEach((op) => op()); },
      };
    },
  };
  return { db, data, stats };
}

const seeded = () => fakeFirestore({
  [INTERNAL_COLLECTION]: {
    denylist: { names: ['Operadora Ficticia'], domains: ['ficticia.example'], publicPlaceNames: [] },
    legacy_tour_ids: { entries: { 'op-x-canyoning': 'arenal-canyoning' } },
    legacy_curated_tour_ids: { entries: {} },
    operator_profiles: { operators: [{ id: 'x' }] },
  },
  [INTERNAL_TOURS_COLLECTION]: { 'arenal-canyoning': TOUR },
});

test('carga desde Firestore: denylist, ids antiguos, perfiles y tours', async () => {
  const { db } = seeded();
  const data = await loadInternalDataFromFirestore(db);
  assert.ok(data);
  assert.deepEqual(data!.denylist.names, ['Operadora Ficticia']);
  assert.equal(data!.legacyTourIds['op-x-canyoning'], 'arenal-canyoning');
  assert.equal(data!.tourSources[0].operatorName, 'Operadora Ficticia');
  assert.equal(data!.operatorProfiles.operators.length, 1);
  assert.equal(await loadInternalDataFromFirestore(fakeFirestore().db), null, 'sin sembrar → null');
});

test('producción: usa Firestore con caché TTL y nunca el JSON local', async () => {
  const { db, stats } = seeded();
  let t = 1_000;
  let localCalls = 0;
  const store = createInternalDataStore({
    isProduction: () => true, ttlMs: 60_000, now: () => t,
    loadFirestore: () => loadInternalDataFromFirestore(db),
    loadLocal: () => { localCalls++; return null; },
    logger: { warn() {}, error() {} },
  });
  const a = await store.get();
  assert.equal(a.source, 'firestore');
  const readsAfterFirst = stats.reads;
  t += 30_000;
  assert.equal(await store.get(), a, 'dentro del TTL: misma instantánea');
  assert.equal(stats.reads, readsAfterFirst, 'sin nuevas lecturas dentro del TTL');
  t += 31_000;
  const b = await store.get();
  assert.notEqual(b, a, 'TTL vencido: recarga');
  assert.ok(stats.reads > readsAfterFirst);
  assert.equal(localCalls, 0, 'producción nunca lee data/internal');
});

test('producción: si Firestore falla conserva la última instantánea buena; sin datos → vacío', async () => {
  let fail = false;
  let t = 0;
  const { db } = seeded();
  const store = createInternalDataStore({
    isProduction: () => true, ttlMs: 10, now: () => t,
    loadFirestore: async () => { if (fail) throw new Error('unavailable'); return loadInternalDataFromFirestore(db); },
    loadLocal: () => { throw new Error('no debe leer local'); },
    logger: { warn() {}, error() {} },
  });
  assert.equal((await store.get()).tourSources.length, 1);
  fail = true; t += 100;
  const kept = await store.get();
  assert.equal(kept.source, 'firestore');
  assert.equal(kept.tourSources.length, 1);

  const empty = createInternalDataStore({
    isProduction: () => true, loadFirestore: async () => null,
    loadLocal: () => { throw new Error('no debe leer local'); }, logger: { warn() {}, error() {} },
  });
  assert.equal((await empty.get()).source, 'empty');
  assert.equal(empty.peek().denylist.names.length, 0);
});

test('fuera de producción: respaldo local solo si existe, sin tocar Firestore', async () => {
  let fsCalls = 0;
  const local = { tourSources: [TOUR as any], legacyTourIds: {}, legacyCuratedTourIds: {}, denylist: { names: ['X'], domains: [] }, operatorProfiles: { operators: [] } };
  const withLocal = createInternalDataStore({ isProduction: () => false, loadFirestore: async () => { fsCalls++; return null; }, loadLocal: () => local });
  const snap = withLocal.peek();
  assert.equal(snap.source, 'local');
  assert.equal(snap.tourSources[0].id, 'arenal-canyoning');
  const without = createInternalDataStore({ isProduction: () => false, loadFirestore: async () => { fsCalls++; return null; }, loadLocal: () => null });
  assert.equal((await without.get()).source, 'empty');
  assert.equal(fsCalls, 0);
});

test('lectores del backend usan el store (sin imports directos de data/internal)', () => {
  for (const file of ['backend/operatorSourcesInternal.ts', 'backend/customerOutboundPrivacy.ts']) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(src, /from ['"][^'"]*data\/internal/, file);
    assert.match(src, /internalDataStore/, file);
  }
});

test('ninguna ruta pública ni src/ importa el store; firestore.rules no abre internal_*', () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|mjs)$/.test(e.name) && /internalDataStore/.test(fs.readFileSync(full, 'utf8'))) offenders.push(full);
    }
  };
  for (const dir of ['src', 'api', 'backend/routes', 'public']) walk(path.join(root, dir));
  assert.deepEqual(offenders, []);
  const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
  assert.doesNotMatch(rules, /match \/internal_/, 'las colecciones internas solo las abre la regla por defecto (deny)');
  assert.match(rules, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);
});

test('siembra: dry-run no escribe y es idempotente con --write', { skip: !fs.existsSync(path.join(root, 'data/internal/operatorTourSources.json')) && 'data/internal/ ausente' }, async () => {
  const { db, stats } = fakeFirestore();
  const docs = buildSeedDocs(root);
  assert.ok(docs.some((d) => d.collection === INTERNAL_TOURS_COLLECTION));
  const plan = await planSeed(db, docs);
  assert.equal(plan.upserts.length, docs.length);
  assert.equal(stats.writes, 0, 'planificar no escribe');
  await applySeed(db, plan, 50);
  assert.equal(stats.writes, docs.length);
  const again = await planSeed(db, docs);
  assert.equal(again.upserts.length, 0, 'segunda corrida sin cambios');
  assert.equal(again.unchanged, docs.length);
  const store = createInternalDataStore({ isProduction: () => true, loadFirestore: () => loadInternalDataFromFirestore(db), logger: { warn() {}, error() {} } });
  const snap = await store.get();
  const local = loadDenylist();
  assert.equal(snap.tourSources.length, docs.filter((d) => d.collection === INTERNAL_TOURS_COLLECTION).length);
  assert.deepEqual(snap.denylist.names, local?.names);
});

test('auditoría de privacidad sin data/internal: modo hash detecta lo mismo', () => {
  const deny = { names: ['Operadora Ficticia', 'Café Río (Uvita)'], domains: ['ficticia.example'] };
  const hashes = buildDenylistHashes(deny, 'sal-test');
  const plainM = buildMatchers(deny);
  const dir = fs.mkdtempSync(path.join(root, 'node_modules', '.tmp-hash-'));
  try {
    fs.mkdirSync(path.join(dir, 'scripts', 'lib'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'scripts/lib/operatorDenylist.hashes.json'), JSON.stringify(hashes));
    const loaded = loadDenylistHashes(dir);
    assert.equal(loaded.names.length, 2);
    assert.ok(!JSON.stringify(loaded).includes('Ficticia'), 'el archivo de hashes no contiene nombres');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  const hashM = buildMatchers(null);
  assert.equal((hashM as { mode?: string }).mode, 'hash');
  const fakeHashM = hashMatchers(hashes);
  for (const text of ['Lo opera Operadora Ficticia.', 'Visita (Café Río (Uvita)) hoy', 'https://www.ficticia.example/tour']) {
    assert.ok(scanText(text, plainM).length > 0, `plain: ${text}`);
    assert.ok(scanText(text, fakeHashM).length > 0, `hash: ${text}`);
  }
  for (const clean of ['Tours en Arenal y Monteverde con nuestro operador local.', 'Operadora, Ficticia no es nombre']) {
    assert.deepEqual(scanText(clean, fakeHashM), [], clean);
  }
  assert.deepEqual(scanText('Tours en Arenal y Monteverde con nuestro operador local.', hashM), []);
  // Con el denylist real (si existe), los hashes versionados deben estar al día y detectar cada nombre.
  const real = loadDenylist();
  if (real) {
    const committed = loadDenylistHashes();
    assert.deepEqual(buildDenylistHashes(real, committed.salt).names, committed.names, 'regenera: node scripts/internal/build-denylist-hashes.mjs');
    for (const name of real.names.slice(0, 50)) assert.ok(scanText(`Tour de ${name}.`, hashM).length > 0, name);
  }
});
