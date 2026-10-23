import test from 'node:test';
import assert from 'node:assert/strict';
import { TOURS } from '../src/data/toursData';
import { getProduct, getPolicies, PRODUCT_FORBIDDEN_FIELDS, priceStatusOf } from '../backend/agentProductTools';
import { AGENT_TOOL_REGISTRY, GEMINI_FUNCTION_DECLARATIONS, executeAgentTool } from '../backend/agentTools';
import { COMPAT_READ_ONLY_TOOLS, selectCompatTools } from '../backend/compatConcierge';
import { LEGAL_PAGES } from '../src/data/legalPages';

const withOperator = TOURS.find(t => t.operatorName || t.providerId || t.operatorId) ?? TOURS[0];

test('get_product devuelve la ficha del catálogo sin ningún dato del operador', () => {
  const res: any = getProduct({ tourId: withOperator.id });
  assert.equal(res.success, true);
  assert.equal(res.product.id, withOperator.id);
  const json = JSON.stringify(res);
  for (const field of PRODUCT_FORBIDDEN_FIELDS) assert.ok(!(field in res.product), `campo prohibido ${field}`);
  for (const secret of [withOperator.operatorName, withOperator.providerId, withOperator.operatorId, withOperator.sourceUrl]) {
    if (typeof secret === 'string' && secret.length >= 4) assert.ok(!json.includes(secret), `fuga de ${secret}`);
  }
  assert.doesNotMatch(json, /wa\.me\/|@[a-z0-9-]+\.[a-z]{2,}/i);
});

test('get_product: id desconocido no inventa nada', () => {
  const res: any = getProduct({ tourId: 'no-existe-xyz' });
  assert.equal(res.success, false);
  assert.equal(res.error, 'tour_not_found');
});

test('get_product: sin precio publicado → consulta_requerida y priceUSD null', () => {
  const noPrice = TOURS.find(t => !(t.priceUSD > 0));
  if (!noPrice) return;
  const res: any = getProduct({ tourId: noPrice.id });
  assert.equal(res.product.priceUSD, null);
  assert.equal(res.product.priceStatus, 'consulta_requerida');
  assert.equal(priceStatusOf(noPrice), 'consulta_requerida');
});

test('get_product respeta el idioma', () => {
  const t = TOURS.find(x => x.title.en && x.title.en !== x.title.es) ?? TOURS[0];
  const en: any = getProduct({ tourId: t.id, language: 'en' });
  assert.ok(en.product.title.length > 0);
  assert.match(en.rules.join(' '), /Never name the local operator/);
});

test('get_policies cita solo las páginas legales publicadas (cancelación + términos)', () => {
  const res: any = getPolicies({ topic: 'cancellation', language: 'es' });
  assert.equal(res.pages.length, 1);
  assert.equal(res.pages[0].id, 'cancellation');
  const published = LEGAL_PAGES.cancellation.sections.flatMap(s => s.paragraphs.es).join(' ');
  for (const s of res.pages[0].sections) assert.ok(published.includes(s.text.slice(0, 40)));
  assert.equal(res.preliminary, true);
  const all: any = getPolicies({});
  assert.deepEqual(all.pages.map((p: any) => p.id), ['cancellation', 'terms']);
  for (const page of all.pages) assert.ok(!page.sections.some((s: any) => /^(Contacto|Contact)$/.test(s.heading)));
});

test('get_product y get_policies están en el registro, en las declaraciones y en el concierge Groq (lectura)', async () => {
  for (const name of ['get_product', 'get_policies']) {
    assert.equal((AGENT_TOOL_REGISTRY as any)[name].sideEffect, false);
    assert.ok(GEMINI_FUNCTION_DECLARATIONS.some((d: any) => d.name === name));
    assert.ok((COMPAT_READ_ONLY_TOOLS as readonly string[]).includes(name));
  }
  const selected = selectCompatTools(GEMINI_FUNCTION_DECLARATIONS as any, AGENT_TOOL_REGISTRY as any).map(d => d.name);
  assert.ok(selected.includes('get_product') && selected.includes('get_policies'));
  const viaRegistry: any = await executeAgentTool('get_product' as any, { tourId: TOURS[0].id });
  assert.equal(viaRegistry.success, true);
});
