import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTripInquiryHandoff, parseTripRequest } from '../src/utils/tripRequestParser';

const tours = [
  { id: 'pacuare-rafting', title: { es: 'Rafting en el río Pacuare', en: 'Pacuare River Rafting' }, category: 'rafting', region: 'pacuare', priceUSD: 110 },
  { id: 'arenal-balsa-river-rafting', title: { es: 'Rafting río Balsa', en: 'Balsa River Rafting' }, category: 'rafting', region: 'arenal', priceUSD: 75 },
];

test('extracts activity, place, party size, month and price intent (ES)', () => {
  const parsed = parseTripRequest('Quiero rafting Pacuare 2 personas diciembre ¿cuánto cuesta?');
  assert.deepEqual(parsed, { activity: 'rafting', place: 'pacuare', people: 2, month: 12, asksPrice: true });
});

test('extracts the same parameters in English', () => {
  const parsed = parseTripRequest('I want a Pacuare rafting tour for 2 people in December, how much does it cost?');
  assert.equal(parsed.activity, 'rafting');
  assert.equal(parsed.place, 'pacuare');
  assert.equal(parsed.people, 2);
  assert.equal(parsed.month, 12);
  assert.equal(parsed.asksPrice, true);
});

test('hand-off acknowledges parameters, gives reference × people and a prefilled WhatsApp link', () => {
  const handoff = buildTripInquiryHandoff('rafting Pacuare 2 personas diciembre ¿cuánto cuesta?', 'es', tours);
  assert.ok(handoff);
  assert.equal(handoff.tourId, 'pacuare-rafting');
  assert.ok(handoff.understood.some(line => line.includes('Personas: 2')));
  assert.ok(handoff.understood.some(line => line.includes('diciembre')));
  assert.equal(handoff.referenceLine, 'US$110 × 2 personas = US$220 (referencia, sujeto a confirmación)');
  assert.match(handoff.operatorNote, /operador todavía no está confirmado/);
  assert.ok(handoff.whatsappUrl.startsWith('https://wa.me/50687959148?text='));
  const message = decodeURIComponent(handoff.whatsappUrl.split('text=')[1]);
  assert.match(message, /Pacuare/);
  assert.match(message, /Personas: 2/);
  assert.match(message, /diciembre/);
  assert.match(message, /US\$220/);
});

test('generic small talk does not trigger a hand-off', () => {
  assert.equal(buildTripInquiryHandoff('Hola, ¿qué tal?', 'es', tours), undefined);
  assert.equal(buildTripInquiryHandoff('Tell me about rafting', 'en', tours), undefined);
});
