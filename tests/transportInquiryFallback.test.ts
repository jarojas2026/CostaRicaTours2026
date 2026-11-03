import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isTransportInquiry, transportQuoteReply } from '../src/utils/transportIntent';
import { buildTripInquiryHandoff } from '../src/utils/tripRequestParser';
import { understandConciergeMessage } from '../backend/conciergeUnderstanding';
import { knowledgeToolReply } from '../backend/knowledgeReplies';

const transferPhrases = [
  { language: 'en' as const, text: 'How much is a transfer from SJO to Manuel Antonio?' },
  { language: 'en' as const, text: 'Do you offer an airport shuttle from San José to Manuel Antonio?' },
  { language: 'es' as const, text: '¿Cuánto cuesta un traslado desde SJO a Manuel Antonio?' },
  { language: 'es' as const, text: 'Necesito transporte del aeropuerto a Manuel Antonio para 3 personas.' },
  { language: 'es' as const, text: '¿Tienen servicio de transporte privado de San José a Manuel Antonio?' },
];

const catalogueTour = {
  id: 'circuit-classic-costa-rica-5d',
  title: {
    es: 'Circuito Esencial de Costa Rica 5 Días',
    en: 'Essential Costa Rica 5-Day Circuit',
  },
  category: 'multi_day',
  region: 'manuel_antonio',
  priceUSD: 780,
};

test('Spanish and English transfer phrases are classified as transport, not tour intent', () => {
  for (const item of transferPhrases) {
    assert.equal(isTransportInquiry(item.text), true, item.text);
  }
  assert.equal(isTransportInquiry('How much is the Arenal Volcano tour?'), false);
  assert.equal(isTransportInquiry('¿Cuánto cuesta el tour del Volcán Arenal?'), false);
});

test('transfer fallback asks for origin, destination, date and travelers without inventing a fare', () => {
  for (const item of transferPhrases) {
    const reply = knowledgeToolReply(item.text, item.language);
    assert.ok(reply, item.text);
    assert.match(reply!, item.language === 'es' ? /origen/i : /pickup location/i);
    assert.match(reply!, item.language === 'es' ? /destino/i : /destination/i);
    assert.match(reply!, item.language === 'es' ? /fecha/i : /date/i);
    assert.match(reply!, item.language === 'es' ? /personas/i : /travelers/i);
    assert.doesNotMatch(reply!, /US\$|USD\s*\d|\$\s*\d|₡\s*\d|Essential Costa Rica|Circuito Esencial/i);
  }
  assert.match(transportQuoteReply('es'), /no hay un precio ni una reserva confirmados/i);
  assert.match(transportQuoteReply('en'), /no price or booking is confirmed/i);
});

test('transport inquiries do not create catalogue quotes, suggestions or WhatsApp tour handoffs', () => {
  for (const item of transferPhrases) {
    const understanding = understandConciergeMessage(item.text, [catalogueTour], { requestedLanguage: item.language });
    assert.equal(understanding.isConcreteInquiry, false, item.text);
    assert.equal(understanding.quote, undefined, item.text);
    assert.equal(understanding.suggestions, undefined, item.text);
    assert.equal(understanding.inquiryHandoff, undefined, item.text);
    assert.equal(buildTripInquiryHandoff(item.text, item.language, [catalogueTour]), undefined, item.text);
  }
});

test('Counter Agent returns the transport quotation before selecting a catalogue tour', () => {
  const source = readFileSync('backend/aiAssistantService.ts', 'utf8');
  const guard = source.indexOf('if (isTransportInquiry(message))');
  const tourSelection = source.indexOf('const matchedTour =');
  const unsafeFallback = source.indexOf('const selectedTour = matchedTour || TOURS[0]');
  const ambiguousGuard = source.indexOf('if (!matchedTour)');
  assert.ok(guard >= 0, 'Counter Agent must have an explicit transport-intent guard');
  assert.ok(tourSelection > guard, 'transport guard must run before catalogue matching');
  assert.equal(unsafeFallback, -1, 'Counter Agent must never substitute the first catalogue tour');
  assert.ok(ambiguousGuard > tourSelection, 'ambiguous quote requests must be checked after matching');
  assert.match(source.slice(guard, tourSelection), /transportQuoteReply/);
  assert.match(source.slice(guard, tourSelection), /recommendedTours:\s*\[\]/);
  assert.match(source.slice(ambiguousGuard, source.indexOf('const selectedTour = matchedTour', ambiguousGuard)), /need to identify the right experience|identificar la experiencia correcta/);
});

test('chat UI suppresses catalogue recommendations and tour handoff for transfer requests', () => {
  const source = readFileSync('src/components/AIAssistant.tsx', 'utf8');
  assert.match(source, /const transportInquiry = isTransportInquiry\(query\)/);
  assert.match(source, /transportInquiry \? undefined : \(serverInquiryHandoff/);
  assert.match(source, /const matchedTours = transportInquiry \? \[\]/);
});
