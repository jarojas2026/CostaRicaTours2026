import assert from 'node:assert/strict';
import test from 'node:test';
import { knowledgeToolReply } from '../backend/knowledgeReplies';

test('budget rafting query returns real tours within budget', () => {
  const r = knowledgeToolReply('Hola, quiero un tour de rafting en Arenal por menos de $100', 'es')!;
  assert.match(r, /rafting/i);
  for (const m of r.matchAll(/US\$(\d+)/g)) assert.ok(Number(m[1]) <= 100);
  assert.match(r, /disponibilidad/);
});

test('health question always starts with 911 and lists a nearby CCSS hospital', () => {
  const r = knowledgeToolReply('Estoy en San Isidro de El General y me siento mal, ¿dónde está el hospital más cercano?', 'es')!;
  assert.match(r.split('\n')[0], /911/);
  assert.match(r, /Hospital/);
});

test('park fee question uses SINAC data', () => {
  assert.match(knowledgeToolReply('¿Cuánto cuesta la entrada al Parque Nacional Poás para extranjeros?', 'es')!, /SINAC/);
});

test('guide question never includes phone numbers', () => {
  const r = knowledgeToolReply('Do you have German-speaking guides in Osa?', 'en')!;
  assert.match(r, /ICT/);
  assert.doesNotMatch(r, /\d{4}-\d{4}|\+506/);
});

test('booking request asks for details and never confirms', () => {
  const r = knowledgeToolReply('Book me a tour tomorrow for 2 people', 'en')!;
  assert.match(r, /date/);
  assert.doesNotMatch(r, /confirmed\b(?! once)/i);
});

test('greetings fall through to the normal assistant', () => {
  assert.equal(knowledgeToolReply('hola', 'es'), undefined);
});
