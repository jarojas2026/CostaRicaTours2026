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
