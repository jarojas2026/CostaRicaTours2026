import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { TOURS } from '../src/data/toursCatalog';

/**
 * Cada redirect 301 de un id viejo (/tour/<viejo>) debe llevar a un tour que
 * existe y que es el MISMO producto (o el equivalente más cercano), nunca a un
 * tour distinto. Si no hay equivalente, el destino debe ser una búsqueda
 * (/tours?q=...). Los ids/slugs de destino no pueden contener operadores.
 */
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const vercel = readJson('vercel.json');
// data/internal/ saldrá del repo (segunda PR): sin esos archivos, las pruebas que los
// necesitan se omiten; la auditoría de nombres usa OPERATOR_DENYLIST_JSON o los hashes.
const HAS_INTERNAL = existsSync('data/internal/operatorTourSources.json') && existsSync('data/internal/operatorDenylist.json') && existsSync('data/internal/legacyCuratedTourIds.json');
const NO_INTERNAL = !HAS_INTERNAL && 'data/internal/ ausente (datos en Firestore)';
const internal = HAS_INTERNAL ? readJson('data/internal/operatorTourSources.json') : { tours: [] };
const denylist = HAS_INTERNAL ? readJson('data/internal/operatorDenylist.json') : { names: [], domains: [] };
const curated = (HAS_INTERNAL ? readJson('data/internal/legacyCuratedTourIds.json') : {}) as Record<string, string>;
const tourById = new Map(TOURS.map(t => [t.id, t]));
const tourRedirects = (vercel.redirects as Array<{ source: string; destination: string; statusCode?: number }>)
  .filter(r => r.source.startsWith('/tour/'));

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'a', 'al', 'con', 'por', 'the', 'of', 'and', 'in', 'with', 'tour', 'tours', 'costa', 'rica']);
const tokens = (s: string) => new Set(
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w))
);
const overlap = (a: Set<string>, b: Set<string>) => [...a].filter(w => b.has(w));

/**
 * Renombres manuales de tours curados (revisados a mano). Título viejo sin la
 * marca del operador y su región: el destino debe compartir región y al menos
 * dos palabras de actividad/lugar con el título viejo.
 */
const CURATED_REVIEWED: Record<string, { oldTitle: string; region: string }> = {
  'arenal-pure-trek-canyoning': { oldTitle: 'Rapel en Cataratas & Cañonismo La Fortuna', region: 'arenal' },
  'arenal-sky-trek-tram-combo': { oldTitle: 'Ultimate: teleférico, canopy y puentes colgantes Arenal', region: 'arenal' },
  'arenal-wave-balsa-rafting': { oldTitle: 'Rafting Río Balsa Clase II-III en La Fortuna', region: 'arenal' },
  'bay-island-sunset-cruise': { oldTitle: 'Crucero al Atardecer y Cena Tropical en Catamarán', region: 'sjo' },
  'doka-grecia-sarchi-tour': { oldTitle: 'Tour de café, Ciudad de Grecia y Cuna Artesanal de Sarchí', region: 'sjo' },
  'guanacaste-diamante-adventure': { oldTitle: 'Adventure Pass frente al mar & Santuario Animal', region: 'guanacaste' },
  'guanacaste-guachipelin-combo': { oldTitle: 'Mega Combo Aventura Rincón de la Vieja', region: 'guanacaste' },
  'guanacaste-marlin-del-rey-sunset': { oldTitle: 'Catamarán al Atardecer & Snorkel', region: 'guanacaste' },
  'manuel-antonio-ocean-king-catamaran': { oldTitle: 'Mega Catamarán con Toboganes & Snorkel', region: 'manuel_antonio' },
  'mistico-hanging-bridges': { oldTitle: 'Santuario de Puentes Colgantes Arenal', region: 'arenal' },
  'monteverde-100-aventura-extreme': { oldTitle: 'Mega Tirolesa Superman & Tarzán Swing', region: 'monteverde' },
  'monteverde-selvatura-all-in-one': { oldTitle: 'All-in-One: Canopy, Puentes & Santuario de Perezosos', region: 'monteverde' },
  'poas-volcano-doka-waterfall': { oldTitle: 'Combo 3 en 1: Volcán Poás, Hacienda de Café y Cataratas La Paz', region: 'sjo' },
  'tortuguero-mawamba-3d2n': { oldTitle: 'Paquete Todo Incluido 3D/2N Canales de Tortuguero', region: 'tortuguero' },
};

const tourText = (id: string) => {
  const t = tourById.get(id)!;
  return `${id} ${t.title.es} ${t.title.en} ${t.location?.placeName ?? ''}`;
};

test('cada redirect de tour apunta a un tour existente o a una búsqueda, sin cadenas', () => {
  assert.ok(tourRedirects.length > 0);
  const sources = new Set(tourRedirects.map(r => r.source));
  for (const r of tourRedirects) {
    assert.equal(r.statusCode, 301, r.source);
    if (r.destination.startsWith('/tours?q=')) continue;
    const m = /^\/tour\/([a-z0-9-]+)$/.exec(r.destination);
    assert.ok(m, `destino inválido ${r.destination}`);
    assert.ok(tourById.has(m![1]), `${r.source} → ${r.destination}: el tour no existe`);
    assert.notEqual(r.source, r.destination);
    assert.ok(!sources.has(r.destination), `cadena de redirects en ${r.destination}`);
  }
});

test('los destinos no revelan operadores en el id/slug', { skip: NO_INTERNAL }, () => {
  const names: string[] = [
    ...(denylist.names ?? []), ...(denylist.aliases ?? []),
  ].map((n: string) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    .filter((n: string) => n.length >= 5);
  for (const r of tourRedirects) {
    const dest = r.destination.toLowerCase();
    for (const n of names) assert.ok(!dest.includes(n), `${r.destination} contiene operador`);
  }
});

test('redirects de tours de operadores: mismo producto (procedencia + región + título)', { skip: NO_INTERNAL }, () => {
  const byId = new Map<string, any>(internal.tours.map((t: any) => [t.id, t]));
  const curatedSources = new Set(Object.keys(curated));
  for (const r of tourRedirects) {
    const from = r.source.slice('/tour/'.length);
    if (curatedSources.has(from) || r.destination.startsWith('/tours?q=')) continue;
    const to = r.destination.slice('/tour/'.length);
    const row = byId.get(to);
    assert.ok(row, `${from} → ${to}: destino sin fila interna`);
    assert.equal(row.legacyId, from, `${from} → ${to}: el destino es otro producto (legacyId ${row.legacyId})`);
    const shared = overlap(tokens(row.originalTitleEs), tokens(`${row.publicTitleEs} ${tourText(to)}`));
    assert.ok(shared.length >= 1, `${from} → ${to}: títulos sin relación ("${row.originalTitleEs}" vs "${row.publicTitleEs}")`);
  }
});

test('redirects de tours curados renombrados: mismo producto revisado a mano', { skip: NO_INTERNAL }, () => {
  assert.deepEqual(Object.keys(curated).sort(), Object.keys(CURATED_REVIEWED).sort(),
    'añade cada renombre curado nuevo a CURATED_REVIEWED tras revisarlo');
  for (const [from, to] of Object.entries(curated)) {
    const tour = tourById.get(to);
    assert.ok(tour, `${from} → ${to}: el tour no existe`);
    const ref = CURATED_REVIEWED[from];
    assert.equal(tour!.region, ref.region, `${from} → ${to}: otra región`);
    const shared = overlap(tokens(ref.oldTitle), tokens(tourText(to)));
    assert.ok(shared.length >= 2, `${from} → ${to}: parece otro tour (comparten: ${shared.join(', ') || 'nada'})`);
  }
});
