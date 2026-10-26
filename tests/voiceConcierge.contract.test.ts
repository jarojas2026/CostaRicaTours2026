import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TOURS } from '../src/data/toursData';
import {
  answerVoiceConcierge, detectVoiceSupport, hotelSlugFromSearch, isVoiceConciergeEnabled, parseTranscript,
  sanitizeHotelSlug, serializeTranscript, speakWithSynthesis, textForSpeech, voiceConciergeGreeting,
  voiceLocaleFor, voiceReplyLanguage, VOICE_TRANSCRIPT_KEY,
} from '../src/utils/voiceConcierge';
import { isPersonalStorageKey } from '../src/utils/privateStorage';

const tours = TOURS as any[];
const read = (file: string) => fs.readFileSync(file, 'utf8');

// ---------------------------------------------------------------- soporte / no soporte

test('detecta soporte de reconocimiento y síntesis sin lanzar errores', () => {
  class Rec {}
  class Utt {}
  assert.deepEqual(detectVoiceSupport(undefined), { recognition: false, synthesis: false });
  assert.deepEqual(detectVoiceSupport({}), { recognition: false, synthesis: false }, 'Firefox: sin APIs');
  assert.deepEqual(detectVoiceSupport({ webkitSpeechRecognition: Rec, speechSynthesis: {}, SpeechSynthesisUtterance: Utt }), { recognition: true, synthesis: true });
  assert.deepEqual(detectVoiceSupport({ speechSynthesis: {}, SpeechSynthesisUtterance: Utt }), { recognition: false, synthesis: true }, 'solo lectura en voz alta');
});

test('sin soporte el componente muestra el aviso de texto y no el micrófono', async () => {
  const { VoiceConcierge } = await import('../src/components/VoiceConcierge');
  const html = renderToStaticMarkup(React.createElement(VoiceConcierge, { language: 'es', tours }));
  assert.match(html, /data-testid="voice-concierge-fallback"/);
  assert.doesNotMatch(html, /data-testid="voice-concierge-mic"/);
  assert.match(html, /data-testid="voice-concierge-input"/, 'el campo de texto siempre está disponible');
});

test('con soporte el micrófono es accesible (aria-label + aria-pressed) y no hay aviso de fallback', async () => {
  const g = globalThis as any;
  const previous = g.window;
  class FakeRecognition { start() {} stop() {} abort() {} }
  g.window = { SpeechRecognition: FakeRecognition, speechSynthesis: { speak() {}, cancel() {} }, SpeechSynthesisUtterance: class {} };
  try {
    const { VoiceConcierge } = await import('../src/components/VoiceConcierge');
    const es = renderToStaticMarkup(React.createElement(VoiceConcierge, { language: 'es', tours }));
    assert.match(es, /data-testid="voice-concierge-mic"[^>]*aria-label="Hablar con el conserje"[^>]*aria-pressed="false"/);
    assert.doesNotMatch(es, /voice-concierge-fallback/);
    assert.match(es, /data-testid="voice-concierge-read-aloud"/);
    const en = renderToStaticMarkup(React.createElement(VoiceConcierge, { language: 'en', tours }));
    assert.match(en, /aria-label="Talk to the concierge"/);
  } finally {
    if (previous === undefined) delete g.window; else g.window = previous;
  }
});

// ---------------------------------------------------------------- ES / EN

test('idioma de voz: es-CR para español, en-US para el resto', () => {
  assert.equal(voiceLocaleFor('es'), 'es-CR');
  assert.equal(voiceLocaleFor('en'), 'en-US');
  assert.equal(voiceLocaleFor('fr'), 'en-US');
});

test('la respuesta sigue el idioma de la página salvo texto claramente en el otro idioma', () => {
  assert.equal(voiceReplyLanguage('¿Cómo reservo un tour?', 'es'), 'es');
  assert.equal(voiceReplyLanguage('tour', 'en'), 'en');
  assert.equal(voiceReplyLanguage('How do I book a tour with my family?', 'es'), 'en');
  assert.equal(voiceReplyLanguage('¿Qué tours hay para la familia?', 'en'), 'es');
});

test('saludo ES/EN y modo hotel con slug saneado', () => {
  assert.match(voiceConciergeGreeting('es'), /conserje de voz/);
  assert.match(voiceConciergeGreeting('en'), /voice concierge/);
  assert.match(voiceConciergeGreeting('es', 'hotel-del-rio'), /Bienvenido a Hotel Del Rio/);
  assert.match(voiceConciergeGreeting('en', 'hotel-del-rio'), /Welcome to Hotel Del Rio/);
  assert.equal(hotelSlugFromSearch('?hotel=Hotel-Del-Rio'), 'hotel-del-rio');
  for (const bad of ['<script>', 'a b', 'x'.repeat(61), '../etc', '']) assert.equal(sanitizeHotelSlug(bad), undefined, bad);
  assert.equal(hotelSlugFromSearch('?hotel=%3Cimg%20src%3Dx%3E'), undefined);
});

test('modo hotel cambia el saludo renderizado sin backend', async () => {
  const { VoiceConcierge } = await import('../src/components/VoiceConcierge');
  const html = renderToStaticMarkup(React.createElement(VoiceConcierge, { language: 'es', tours, hotel: 'casa-pura-vida' }));
  assert.match(html, /data-testid="voice-concierge-hotel"/);
  assert.match(html, /Bienvenido a Casa Pura Vida/);
});

// ---------------------------------------------------------------- reglas del conserje

test('nunca confirma reservas, precios finales ni pagos: deriva a solicitud humana', () => {
  for (const [q, lang] of [['Quiero reservar rafting Pacuare para 2', 'es'], ['Confirm my booking and charge my card', 'en'], ['¿Puedo pagar por SINPE?', 'es'], ['What is the final price?', 'en']] as const) {
    const a = answerVoiceConcierge(q, tours, { language: lang });
    assert.equal(a.intent, 'booking_handoff', q);
    assert.equal(a.offerRequest, true, q);
    assert.match(a.reply, lang === 'es' ? /No puedo confirmar reservas, precios finales ni pagos/ : /can't confirm bookings, final prices or payments/, q);
    assert.doesNotMatch(a.reply, /(reserva confirmada|booking confirmed|pago recibido|payment received)/i, q);
  }
});

test('responde con datos de la plataforma: cómo reservar, contacto, regiones y tours (ES/EN)', () => {
  assert.equal(answerVoiceConcierge('¿Cómo reservo un tour?', tours, { language: 'es' }).intent, 'how_to_book');
  assert.equal(answerVoiceConcierge('How do I book?', tours, { language: 'en' }).intent, 'how_to_book');
  const contact = answerVoiceConcierge('necesito hablar con una persona', tours, { language: 'es' });
  assert.equal(contact.intent, 'contact');
  assert.match(contact.whatsappUrl || '', /^https:\/\/wa\.me\//);
  const regions = answerVoiceConcierge('What tours are there?', tours, { language: 'en' });
  assert.equal(regions.intent, 'regions');
  assert.match(regions.reply, new RegExp(`${tours.length} tours`));
  const monteverde = answerVoiceConcierge('tours en Monteverde', tours, { language: 'es' });
  assert.equal(monteverde.intent, 'tours');
  assert.ok(monteverde.tours?.length && monteverde.tours.every(t => tours.find(x => x.id === t.tourId)?.region === 'monteverde'));
  for (const t of monteverde.tours!) if (t.referenceLine) assert.match(t.referenceLine, /referencia, sujeto a confirmación/);
  const concrete = answerVoiceConcierge('whale watching in Uvita for 3 people in March', tours, { language: 'en' });
  assert.equal(concrete.intent, 'tours');
  assert.equal(concrete.language, 'en');
  assert.match(concrete.reply, /reference, subject to confirmation/);
});

test('pregunta no cubierta se marca como capability gap y ofrece solicitud humana', () => {
  const a = answerVoiceConcierge('¿Cuál es la clave del wifi?', tours, { language: 'es' });
  assert.equal(a.intent, 'capability_gap');
  assert.equal(a.capabilityGap, true);
  assert.equal(a.offerRequest, true);
});

test('el conserje es local: sin fetch, sin servicios pagos ni claves', () => {
  const sources = ['src/utils/voiceConcierge.ts', 'src/hooks/useSpeechSynthesis.ts', 'src/components/VoiceConcierge.tsx', 'src/pages/VoiceConciergePage.tsx'].map(read).join('\n');
  assert.doesNotMatch(sources, /\bfetch\(|XMLHttpRequest|axios|elevenlabs|openai|@google\/genai|anthropic|api[_-]?key/i);
});

// ---------------------------------------------------------------- privacidad: nunca audio

test('no captura ni guarda audio: sin getUserMedia, MediaRecorder, Blob ni AudioContext', () => {
  const sources = ['src/utils/voiceConcierge.ts', 'src/hooks/useSpeechSynthesis.ts', 'src/components/VoiceConcierge.tsx'].map(read).join('\n');
  assert.doesNotMatch(sources, /getUserMedia|MediaRecorder|new Blob|AudioContext|localStorage|indexedDB/);
});

test('el historial es solo texto, en privateStorage (visitante = sessionStorage)', () => {
  assert.equal(isPersonalStorageKey(VOICE_TRANSCRIPT_KEY), true);
  const raw = serializeTranscript([
    { id: '1', sender: 'guest', text: 'hola data:audio/webm;base64,AAAA', via: 'voice', audio: new Uint8Array([1, 2]), blob: 'x' } as any,
    { id: '2', sender: 'concierge', text: 'respuesta', whatsappUrl: 'javascript:alert(1)' } as any,
  ]);
  const parsed = JSON.parse(raw);
  assert.deepEqual(Object.keys(parsed[0]).sort(), ['id', 'sender', 'text', 'via']);
  assert.doesNotMatch(raw, /data:audio|base64|audio|blob|javascript:/);
  assert.equal(parseTranscript(raw).length, 2);
  assert.deepEqual(parseTranscript('no-json'), []);
  const component = read('src/components/VoiceConcierge.tsx');
  assert.match(component, /from '\.\.\/utils\/privateStorage'/);
  assert.match(component, /withStorageScope\(VoiceConciergeComponent\)/);
});

// ---------------------------------------------------------------- síntesis de voz

test('speechSynthesis lee texto limpio en el idioma correcto y degrada sin soporte', () => {
  const spoken: any[] = [];
  let cancels = 0;
  class Utt { lang = ''; rate = 0; onend: any; onerror: any; constructor(public text: string) {} }
  const synth = { speak: (u: any) => spoken.push(u), cancel: () => { cancels += 1; } };
  assert.equal(speakWithSynthesis(synth, Utt, '**Hola**\n• Tour https://x.y', 'es'), true);
  assert.equal(spoken[0].lang, 'es-CR');
  assert.equal(spoken[0].text, textForSpeech('**Hola**\n• Tour https://x.y'));
  assert.doesNotMatch(spoken[0].text, /\*|•|https/);
  assert.equal(cancels, 1, 'corta la lectura anterior');
  assert.equal(speakWithSynthesis(synth, Utt, 'Hello', 'en'), true);
  assert.equal(spoken[1].lang, 'en-US');
  assert.equal(speakWithSynthesis(null, Utt, 'x', 'es'), false);
  assert.equal(speakWithSynthesis(synth, null, 'x', 'es'), false);
});

// ---------------------------------------------------------------- aislamiento

test('ruta /conserje aislada detrás de flag, lazy y sin tocar Header/BottomNav', () => {
  const app = read('src/App.tsx');
  assert.match(app, /lazy\(\(\) => import\('\.\/pages\/VoiceConciergePage'\)/);
  assert.match(app, /<Route path="\/conserje"/);
  assert.doesNotMatch(read('src/components/Header.tsx'), /conserje|VoiceConcierge/i);
  assert.doesNotMatch(read('src/components/BottomNav.tsx'), /conserje|VoiceConcierge/i);
  assert.equal(isVoiceConciergeEnabled(undefined), true);
  assert.equal(isVoiceConciergeEnabled('off'), false);
  assert.equal(isVoiceConciergeEnabled(' OFF '), false);
  const vercel = JSON.parse(read('vercel.json'));
  assert.ok(vercel.rewrites.some((r: any) => r.source === '/conserje' && r.destination === '/index.html'));
});
