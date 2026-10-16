import assert from 'node:assert/strict';
import test from 'node:test';
import { findGuides, findNearestServices, getParkInfo, searchOperatorTours } from '../backend/nationalKnowledgeService';
import { AGENT_TOOL_REGISTRY, GEMINI_FUNCTION_DECLARATIONS } from '../backend/agentTools';

test('new knowledge tools are registered and declared for the model', () => {
  const declared = new Set(GEMINI_FUNCTION_DECLARATIONS.map((d) => d.name));
  for (const name of ['search_operator_tours', 'find_guides', 'park_info', 'nearest_services']) {
    assert.ok(name in AGENT_TOOL_REGISTRY, `${name} missing in registry`);
    assert.ok(declared.has(name), `${name} missing in declarations`);
    assert.equal((AGENT_TOOL_REGISTRY as any)[name].sideEffect, false);
  }
});

test('find_guides filters by language and never exposes names or contacts', () => {
  const r = findGuides({ language: 'German', limit: 5 });
  assert.ok(r.totalMatches > 10);
  assert.ok(r.languages.some((l) => /alem/i.test(l)));
  const json = JSON.stringify(r);
  assert.equal('guides' in r, false);
  assert.equal('associations' in r, false);
  assert.doesNotMatch(json, /@|\+506|phone|email/i);
  assert.ok(findGuides({ region: 'Osa' }).totalMatches > 50);
});

test('park_info returns official SINAC data with source', () => {
  const r = getParkInfo('Poás');
  assert.ok(r.success);
  assert.match(String(r.results![0].source), /sinac\.go\.cr/);
});

test('nearest_services finds CCSS facilities near San Isidro de El General and rejects foreign coords', () => {
  const r = findNearestServices(9.3727, -83.7036, 'hospital', 3);
  assert.ok(r.success);
  assert.equal(r.emergencyNumber, '911');
  assert.ok(r.results!.length > 0 && r.results![0].distanceKm < 15);
  assert.equal(findNearestServices(40.7, -74, 'hospital').success, false);
});

test('search_operator_tours respects budget and labels price status', () => {
  const r = searchOperatorTours({ maxPriceUSD: 60, limit: 15 });
  assert.ok(r.success);
  for (const t of r.tours) {
    assert.ok(t.priceUSD !== null && t.priceUSD <= 60);
    assert.equal(t.priceStatus, 'precio_de_referencia');
    assert.equal((t as any).sourceUrl, undefined);
    assert.equal((t as any).operator, undefined);
  }
});
