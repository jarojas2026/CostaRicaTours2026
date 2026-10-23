import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { detectTransactionalIntent, filterVoiceTools, isTransactionalTool, quoteFormUrl, voiceHandoffReply, voiceTransactionsAllowed } from '../backend/voiceHandoffPolicy';

const toolNames = [...readFileSync('backend/agentTools.ts', 'utf8').matchAll(/name: '([a-z_]+)'/g)].map(m => m[1]);

test('by default no transactional tool reaches the voice channel', () => {
  assert.equal(voiceTransactionsAllowed({}), false);
  const filtered = filterVoiceTools(toolNames.map(name => ({ name })), {}).map(t => t.name);
  assert.ok(toolNames.includes('create_reservation'));
  assert.ok(!filtered.includes('create_reservation'));
  assert.ok(filtered.includes('search_tours') && filtered.includes('quote_price') && filtered.includes('lookup_booking'), 'read-only tools stay');
  assert.ok(filtered.every(n => !isTransactionalTool(n)));
  assert.equal(filterVoiceTools([{ name: 'create_reservation' }], { VOICE_TRANSACTIONS_BY_VOICE: 'true' }).length, 1);
});

test('detects booking and payment intent in ES/EN', () => {
  assert.equal(detectTransactionalIntent('Quiero reservar el rafting'), 'book');
  assert.equal(detectTransactionalIntent('I want to book a tour'), 'book');
  assert.equal(detectTransactionalIntent('¿Puedo pagar con tarjeta?'), 'pay');
  assert.equal(detectTransactionalIntent('Can I pay now?'), 'pay');
  assert.equal(detectTransactionalIntent('¿Qué tal el clima en Arenal?'), 'other');
});

test('handoff points to the quote form, never confirms, never names providers', () => {
  const env = { PUBLIC_BASE_URL: 'https://costaricatours2026.vercel.app' };
  assert.equal(quoteFormUrl(env, 'arenal-rafting'), 'https://costaricatours2026.vercel.app/tour/arenal-rafting');
  assert.equal(quoteFormUrl(env, '../evil'), 'https://costaricatours2026.vercel.app/tours');
  assert.equal(quoteFormUrl({ PUBLIC_BASE_URL: 'http://x.test' }), null);
  for (const lang of ['es', 'en'] as const) for (const intent of ['book', 'pay'] as const) {
    const r = voiceHandoffReply(intent, lang, env);
    assert.match(r, /costaricatours2026\.vercel\.app/);
    assert.doesNotMatch(r, /confirmad[ao]|confirmed|operador|operator|provider|proveedor/i);
  }
  assert.match(voiceHandoffReply('pay', 'es', {}), /nuestra web/);
});

test('module sends nothing by itself (no fetch, no mail)', () => {
  const src = readFileSync('backend/voiceHandoffPolicy.ts', 'utf8');
  assert.doesNotMatch(src, /fetch\(|sendEmail|sendMail|twilio\.|messages\.create/);
});

// Cableado: el bloqueo existe en los tres puntos (declaraciones, ejecutor y turno de voz).
import { readFileSync as readSrc } from 'node:fs';

test('cableado: handleVoiceTurn deriva intención de reserva/pago antes de llamar a la IA', () => {
  const src = readSrc('backend/voiceAgentDeskService.ts', 'utf8');
  const body = src.slice(src.indexOf('export async function handleVoiceTurn'));
  const guard = body.indexOf('detectTransactionalIntent(textInput)');
  const handoff = body.indexOf('voiceHandoffReply(transactionalIntent, language)');
  const ai = body.indexOf('askCounterDesk(');
  assert.ok(guard > -1 && handoff > guard && ai > handoff, 'el traspaso debe ir antes de askCounterDesk');
});

test('cableado: canal voz filtra herramientas y el ejecutor rechaza las transaccionales', () => {
  const ai = readSrc('backend/aiAssistantService.ts', 'utf8');
  assert.match(ai, /options\.voiceChannel \? filterVoiceTools\(GEMINI_FUNCTION_DECLARATIONS/);
  assert.match(ai, /options\.voiceChannel && !voiceTransactionsAllowed\(\) && isTransactionalTool\(toolName\)/);
  assert.match(readSrc('backend/counterDeskService.ts', 'utf8'), /voiceChannel: channel === 'voice'/);
});

test('doc: el paso 5 ya no permite create_reservation por voz', () => {
  const doc = readSrc('docs/portable-voice-agent-desk.md', 'utf8');
  assert.doesNotMatch(doc, /Only explicit customer confirmation can invoke `create_reservation`/);
  assert.match(doc, /No bookings or payments by voice/);
});
