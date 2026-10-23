import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { cleanTtsText, elevenLabsConfig, elevenLabsStatus, getTtsAuditLog, resetElevenLabsState, synthesizeSpeech } from '../backend/elevenLabsVoice';

const KEY = 'test-key-not-real-0123456789abcdef';
const ON = { ELEVENLABS_ENABLED: 'true', ELEVENLABS_API_KEY: KEY, ELEVENLABS_VOICE_ID_ES: 'voice-es', ELEVENLABS_VOICE_ID_EN: 'voice-en', ELEVENLABS_BASE_URL: 'https://tts.invalid' };

function mockFetch(calls: any[], status = 200, bytes = 'MP3DATA'): typeof fetch {
  return (async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    return new Response(status === 200 ? Buffer.from(bytes) : 'err', { status });
  }) as typeof fetch;
}

test('flag off by default: never calls out, browser fallback', async () => {
  resetElevenLabsState();
  const calls: any[] = [];
  assert.equal(elevenLabsConfig({}).enabled, false);
  const r = await synthesizeSpeech({ text: 'Hola' }, { env: {}, fetchImpl: mockFetch(calls) });
  assert.deepEqual(r, { ok: false, fallback: 'browser', reason: 'disabled' });
  assert.equal(calls.length, 0);
});

test('flag on without key falls back silently', async () => {
  resetElevenLabsState();
  const calls: any[] = [];
  const r = await synthesizeSpeech({ text: 'Hola' }, { env: { ELEVENLABS_ENABLED: 'true' }, fetchImpl: mockFetch(calls) });
  assert.equal(r.ok, false);
  assert.equal(calls.length, 0);
});

test('synthesizes ES/EN with the right voice, caches repeats, key only in header', async () => {
  resetElevenLabsState();
  const calls: any[] = [];
  const f = mockFetch(calls);
  const es = await synthesizeSpeech({ text: 'Hola **mundo** [TOUR:x]', language: 'es' }, { env: ON, fetchImpl: f });
  assert.equal(es.ok, true);
  assert.match(calls[0].url, /voice-es$/);
  assert.equal(calls[0].init.headers['xi-api-key'], KEY);
  assert.equal(JSON.parse(calls[0].init.body).text, 'Hola mundo');
  const again = await synthesizeSpeech({ text: 'Hola **mundo** [TOUR:x]', language: 'es' }, { env: ON, fetchImpl: f });
  assert.equal(again.ok && again.cached, true);
  assert.equal(calls.length, 1);
  await synthesizeSpeech({ text: 'Hello', language: 'en-US' }, { env: ON, fetchImpl: f });
  assert.match(calls[1].url, /voice-en$/);
  const log = JSON.stringify(getTtsAuditLog());
  assert.ok(!log.includes('Hola') && !log.includes(KEY), 'audit has no text or key');
});

test('daily cap blocks spend and falls back', async () => {
  resetElevenLabsState();
  const calls: any[] = [];
  const env = { ...ON, ELEVENLABS_DAILY_CHAR_CAP: '100' };
  const r1 = await synthesizeSpeech({ text: 'a'.repeat(90) }, { env, fetchImpl: mockFetch(calls) });
  assert.equal(r1.ok, true);
  const r2 = await synthesizeSpeech({ text: 'b'.repeat(20) }, { env, fetchImpl: mockFetch(calls) });
  assert.deepEqual(r2, { ok: false, fallback: 'browser', reason: 'cap_reached' });
  assert.equal(calls.length, 1);
});

test('provider error and thrown fetch fall back silently', async () => {
  resetElevenLabsState();
  const r = await synthesizeSpeech({ text: 'Hola' }, { env: ON, fetchImpl: mockFetch([], 500) });
  assert.equal(r.ok, false);
  const r2 = await synthesizeSpeech({ text: 'Hola' }, { env: ON, fetchImpl: (async () => { throw new Error('net'); }) as any });
  assert.equal(r2.ok, false);
});

test('status never exposes key nor provider name; text is trimmed', () => {
  const s = JSON.stringify(elevenLabsStatus(ON));
  assert.ok(!s.includes(KEY));
  assert.ok(!/eleven/i.test(s));
  assert.equal(cleanTtsText('x'.repeat(1000), 600).length, 600);
});

test('route is admin-only, provider-neutral, and no VITE_ key exists', () => {
  const route = readFileSync('backend/routes/voiceTts.ts', 'utf8');
  assert.match(route, /post\('\/api\/voice\/tts', requireAdmin/);
  assert.match(route, /get\('\/api\/voice\/tts\/status', requireAdmin/);
  const body = route.split('\n').filter(l => !l.startsWith('import')).join('\n');
  assert.ok(!/['"`][^'"`\n]*eleven[^'"`\n]*['"`]/i.test(body), 'no provider name in route strings');
  for (const f of ['src/vite-env.d.ts', 'vite.config.ts']) assert.ok(!/VITE_ELEVENLABS/i.test(readFileSync(f, 'utf8')));
});
