import assert from 'node:assert/strict';
import test from 'node:test';
import { TOURS } from '../src/data/toursData';
import { understandConciergeMessage, enforceSingleReferencePrice, deterministicConciergeReply } from '../backend/conciergeUnderstanding';
import { parseTripRequest } from '../src/utils/tripRequestParser';

const now = new Date('2026-10-19T12:00:00Z');

test('trip length is never read as party size ("for 3 days", "para 3 días")', () => {
  for (const msg of ['What can I do in Uvita for 3 days?', '¿Qué hago en Uvita para 3 días?', 'Plans in Uvita for three days', 'Uvita para tres noches']) {
    assert.equal(parseTripRequest(msg).people, undefined, msg);
    const u = understandConciergeMessage(msg, TOURS as any, { now, requestedLanguage: 'es' });
    assert.equal(u.understood.people, undefined, msg);
    assert.ok(u.understood.days === 3 || u.understood.nights === 3, msg);
  }
  // Personas siguen funcionando.
  assert.equal(parseTripRequest('rafting para 2').people, 2);
  assert.equal(parseTripRequest('rafting for 4 people').people, 4);
});

test('a place + trip length gets catalog activity ideas for the area', () => {
  const u = understandConciergeMessage('What can I do in Uvita for 3 days?', TOURS as any, { now, requestedLanguage: 'es' });
  assert.equal(u.understood.language, 'en');
  assert.equal(u.isConcreteInquiry, true);
  assert.ok((u.suggestions?.length ?? 0) > 0, 'sin sugerencias de actividades');
  const reply = deterministicConciergeReply(u) || '';
  assert.match(reply, /Trip length: 3 days/);
  assert.doesNotMatch(reply, /People: 3/);
});

test('reply language follows the user message, not the UI language', () => {
  const es = understandConciergeMessage('¿Cuánto cuesta el rafting en Arenal para 2 personas?', TOURS as any, { now, requestedLanguage: 'en' });
  assert.equal(es.understood.language, 'es');
  const en = understandConciergeMessage('How much is rafting in Arenal for 2 people?', TOURS as any, { now, requestedLanguage: 'es' });
  assert.equal(en.understood.language, 'en');
});

test('only one catalog reference price per answer, labelled as reference', () => {
  const u = understandConciergeMessage('¿Cuánto cuesta el rafting en Arenal para 2 personas?', TOURS as any, { now, requestedLanguage: 'en' });
  assert.ok(u.quote, 'sin cotización de referencia');
  const modelReply = 'El rafting en el río Balsa es ideal para principiantes. Cuesta US$83 por adulto, unos 166 dólares en total. También hay opción a US$75 × 2 = US$150.\nIncluye guía y equipo.';
  const out = enforceSingleReferencePrice(modelReply, u);
  assert.doesNotMatch(out, /83|166/);
  const amounts = out.match(/US\$\d+/g) || [];
  assert.deepEqual([...new Set(amounts)].sort(), [`US$${u.quote!.unitPriceUSD}`, `US$${u.quote!.totalUSD}`].sort());
  assert.match(out, /referencia, sujeto a confirmación/);
  assert.match(out, /Incluye guía y equipo/);
  // Sin cotización del servidor no se toca la respuesta.
  assert.equal(enforceSingleReferencePrice('Hola US$10', { ...u, quote: undefined }), 'Hola US$10');
});

test('concierge route answers in the detected language and enforces the single price', async () => {
  const fs = await import('node:fs');
  const route = fs.readFileSync('backend/routes/agents.ts', 'utf8');
  assert.match(route, /const lang = \(understanding\?\.understood\.language/);
  assert.match(route, /enforceSingleReferencePrice\(assistantResult\.reply, understanding\)/);
});
