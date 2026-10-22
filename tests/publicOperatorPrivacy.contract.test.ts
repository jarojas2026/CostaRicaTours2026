/**
 * Decisión del negocio: el cliente NO ve datos del proveedor/operador antes de reservar
 * (nombre, oficina, teléfonos, correo, WhatsApp, web, enlace de fuente, logo). Si los ve,
 * reserva directo. Este contrato falla si el catálogo público, src/, public/, el bundle
 * (dist/, cuando existe) o las respuestas públicas del agente/endpoints los exponen.
 *
 * El denylist (data/internal/operatorDenylist.json) y los datos internos
 * (data/internal/operatorTourSources.json) los genera scripts/catalog/build_operator_tours.py.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { TOURS } from '../src/data/toursCatalog';
import { renderTourHtml } from '../scripts/tourPrerender';
import { searchOperatorTours, findGuides } from '../backend/nationalKnowledgeService';
import { knowledgeToolReply } from '../backend/knowledgeReplies';
import { executeAgentTool } from '../backend/agentTools';
import { getTourMediaById } from '../backend/tourMediaService';
import { mergeRemoteTours } from '../src/utils/mergeRemoteTours';
import { SUPPLIER_POLICY } from '../src/utils/operatorPrivacy';
import { operatorSourceForTour } from '../backend/operatorSourcesInternal';
import { matchOperatorCandidates } from '../backend/leadPipeline';
// @ts-ignore módulo .mjs con JSDoc
import { buildMatchers, scanText, scanPublicTree, listFiles, OPERATOR_FIELD_KEYS } from '../scripts/lib/operatorPrivacyScan.mjs';

const root = process.cwd();
const matchers = buildMatchers();
const readJson = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const internal = readJson('data/internal/operatorTourSources.json');
const publicCatalog = readJson('src/data/catalogTours.json');
const KNOWN = ['Desafío', 'Pure Trek', 'Selvatura', 'Hacienda Guachipelín', 'Iguana Tours', 'Sky Adventures', 'Mawamba', 'Expediciones Tropicales', 'Alsama Tours'];

const leak = (value: unknown, opts: { fields?: boolean } = {}) =>
  scanText(typeof value === 'string' ? value : JSON.stringify(value), matchers, { names: true, domains: true, fields: opts.fields ?? true }) as string[];

test('denylist is populated from the internal sources (names + domains)', () => {
  assert.ok(internal.tours.length >= 500);
  assert.ok(matchers.names.length >= 150, `names ${matchers.names.length}`);
  assert.ok(matchers.domains.length >= 150, `domains ${matchers.domains.length}`);
  for (const name of KNOWN) assert.ok(matchers.names.some((m: any) => m.name === name), `${name} missing from denylist`);
  // El archivo interno sí tiene la información (lo usa el backend para asignar leads).
  for (const row of internal.tours) assert.ok(row.operatorName && /^https:\/\//.test(row.sourceUrl), row.id);
});

test('public catalog JSON has only public fields', () => {
  const allowed = new Set(['id', 'slug', 'titleEs', 'titleEn', 'category', 'region', 'placeName', 'lat', 'lng', 'priceUSD', 'childPriceUSD', 'durationHours', 'difficulty', 'descriptionEs', 'descriptionEn', 'includes', 'ageMinimum', 'priceNote', 'operatorIctVerified', 'reviewedAt']);
  assert.deepEqual(Object.keys(publicCatalog).sort(), ['priceLabel', 'reviewedAt', 'tours']);
  assert.equal(publicCatalog.priceLabel.es, 'Precio de referencia, sujeto a confirmación');
  for (const row of publicCatalog.tours) {
    for (const key of Object.keys(row)) assert.ok(allowed.has(key), `${row.id}: campo no público ${key}`);
    assert.deepEqual(leak(row), [], row.id);
    assert.doesNotMatch(row.id, /^op-/, `${row.id}: id con prefijo de operador`);
  }
  assert.equal(fs.existsSync(path.join(root, 'src/data/operatorTours.json')), false, 'el JSON con operadores no debe volver a src/');
});

test('every tour in the client catalog is free of operator fields, names and domains', () => {
  for (const tour of TOURS) {
    for (const key of OPERATOR_FIELD_KEYS) assert.equal((tour as any)[key], undefined, `${tour.id}.${key}`);
    assert.notEqual((tour as any).priceSource, 'publicado_por_operador', tour.id);
    const text = { id: tour.id, slug: tour.slug, title: tour.title, subtitle: tour.subtitle, description: tour.description, highlights: tour.highlights, inclusions: tour.inclusions, place: tour.location?.placeName, pickup: tour.pickupHotels, itinerary: tour.itinerarySteps, faqs: tour.faqs };
    assert.deepEqual(leak(text), [], tour.id);
  }
});

test('src/ never imports server-only operator data and contains no operator names or domains', () => {
  for (const file of listFiles(path.join(root, 'src'))) {
    const src = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(src, /data\/internal|data\/operators|data\/guides|operatorTourSources|operatorProspects/, `${file} imports server-only data`);
    assert.deepEqual(scanText(src, matchers, { names: true, domains: true }), [], path.relative(root, file));
  }
});

test('public/ (static files and map layers) exposes no operator domains, fields or names', () => {
  assert.deepEqual(scanPublicTree(path.join(root, 'public'), matchers), []);
});

test('built bundle dist/ (when present) exposes no operator data', { skip: !fs.existsSync(path.join(root, 'dist', 'index.html')) }, () => {
  const findings = scanPublicTree(path.join(root, 'dist'), matchers, { skip: (f: string) => /server\.cjs(\.map)?$/.test(f) });
  assert.deepEqual(findings, []);
});

test('pre-rendered pages, JSON-LD and meta tags have neutral operator text only', () => {
  const template = '<html><head><title>x</title><meta name="description" content="x"></head><body><div id="root"></div></body></html>';
  for (const tour of TOURS) {
    const html = renderTourHtml(template, tour, TOURS);
    assert.deepEqual(leak(html, { fields: false }), [], tour.id);
    assert.match(html, /Operador local (seleccionado por Costa Rica Tours|con declaratoria turística verificada por nuestro equipo)/);
    assert.doesNotMatch(html, /nofollow noopener|Fuente del operador/);
    const schema = html.match(/<script id="tour-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || '';
    assert.doesNotMatch(schema, /provider|organizer|operator|seller|brand|url":"https?:\/\/(?!costaricatours2026)/i, tour.id);
  }
});

test('sitemap lists only neutral tour ids', () => {
  const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
  assert.deepEqual(leak(sitemap, { fields: false }), []);
  for (const legacy of Object.keys(readJson('data/internal/legacyTourIds.json'))) {
    assert.ok(!sitemap.includes(`/tour/${legacy}<`), legacy);
  }
});

test('old ids with operator names 301-redirect to existing neutral ids without breaking /tour rewrite', () => {
  const vercel = readJson('vercel.json');
  const legacy = { ...readJson('data/internal/legacyTourIds.json'), ...readJson('data/internal/legacyCuratedTourIds.json') } as Record<string, string>;
  const ids = new Set(TOURS.map(t => t.id));
  const redirects = new Map((vercel.redirects || []).map((r: any) => [r.source, r]));
  for (const [from, to] of Object.entries(legacy)) {
    if (from === to) continue;
    assert.ok(ids.has(to), `${to} no existe`);
    assert.ok(!ids.has(from), `${from} sigue publicado`);
    const r: any = redirects.get(`/tour/${from}`);
    assert.ok(r && r.destination === `/tour/${to}` && r.statusCode === 301, `falta redirect ${from}`);
  }
  assert.ok(vercel.rewrites.some((r: any) => r.source === '/tour/:id' && r.destination === '/tour/:id/index.html'));
});

test('concierge / agent replies never name operators and answer supplier questions truthfully', async () => {
  const messages = [
    'quiero rafting en arenal por menos de 100', 'canopy en monteverde', 'tours en guanacaste de 80 dólares',
    'guía que hable alemán en osa', 'guide speaking french', '¿quién es el operador del tour?', 'which company runs the tour?',
    'café en heredia', 'snorkel en caño', 'avistamiento de ballenas uvita', 'reservar canyoning',
  ];
  for (const m of messages) {
    for (const lang of ['es', 'en'] as const) {
      const reply = knowledgeToolReply(m, lang) || '';
      assert.deepEqual(leak(reply, { fields: false }), [], `${lang}: ${m}`);
      assert.doesNotMatch(reply, /todos (están|son) certificados|all (are )?ICT[- ]certified/i);
    }
  }
  const supplier = knowledgeToolReply('¿Con qué operador es el tour?', 'es') || '';
  assert.ok(supplier.includes(SUPPLIER_POLICY.es), supplier);
  const tools = [
    searchOperatorTours({ limit: 15 }), searchOperatorTours({ query: 'rafting', limit: 15 }), searchOperatorTours({ region: 'monteverde', limit: 15 }),
    findGuides({ language: 'German' }), findGuides({ region: 'Osa' }),
    await executeAgentTool('search_tours', { query: 'canopy' }), await executeAgentTool('search_tours', { region: 'arenal' }),
    await executeAgentTool('search_operator_tours', { query: 'canyoning', operator: 'Desafío' }),
  ];
  for (const result of tools) assert.deepEqual(leak(result), [], JSON.stringify(result).slice(0, 200));
});

test('public tour media endpoint data carries no operator identity', () => {
  for (const tour of TOURS) assert.deepEqual(leak(getTourMediaById(tour.id, TOURS as any) ?? {}), [], tour.id);
});

test('remote Firestore tour docs are stripped of operator fields before reaching the UI', () => {
  const local = TOURS.find(t => t.priceUSD > 0)!;
  const merged = mergeRemoteTours([{ docId: 'x', tour: { ...local, operatorName: 'Pure Trek Canyoning', sourceUrl: 'https://puretrek.com/x', inquirySourceUrl: 'https://puretrek.com', operatorLogo: 'https://puretrek.com/logo.png', title: { es: 'Pure Trek canyoning', en: 'Pure Trek canyoning' } } as any }], TOURS);
  const tour = merged.find(t => t.id === local.id)!;
  assert.deepEqual(leak(tour), []);
  const admin = fs.readFileSync(path.join(root, 'backend/commerceAdminRouter.ts'), 'utf8');
  const publicDoc = admin.slice(admin.indexOf('tx.create(productRef'), admin.indexOf("tx.create(db.collection('tour_private')"));
  assert.doesNotMatch(publicDoc, /operatorName|inquirySourceUrl/, 'la ficha pública de Firestore no debe guardar datos del proveedor');
});

test('server keeps operator identity internally to route leads (admin only)', () => {
  const row = internal.tours.find((t: any) => t.legacyId === 'op-desafio-lost-canyon-canyoning');
  assert.ok(row && TOURS.some(t => t.id === row.id));
  assert.equal(operatorSourceForTour('op-desafio-lost-canyon-canyoning')?.operatorName, row.operatorName);
  const [first] = matchOperatorCandidates({ tourId: row.id, region: 'arenal', activity: 'adventure' });
  assert.equal(first?.name, row.operatorName);
});

test('customer-facing copy never claims every operator is ICT-certified', () => {
  for (const file of listFiles(path.join(root, 'src'))) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /todos (los operadores )?(están|son) certificados por el ICT|all operators are ICT[- ]certified/i, file);
  }
  const terms = fs.readFileSync(path.join(root, 'src/data/legalPages.ts'), 'utf8');
  assert.match(terms, /la identidad del operador se indica en la confirmación de la reserva/);
});
