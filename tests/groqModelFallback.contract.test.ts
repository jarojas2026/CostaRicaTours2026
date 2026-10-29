import test from 'node:test';
import assert from 'node:assert/strict';
import { getOpenAiCompatConfig } from '../backend/aiConfig';
import { openAiCompatChat, shouldFallbackToSmallerModel } from '../backend/openaiCompatClient';
import { capacitySlots } from '../backend/aiCapacityRouter';

const KEY = 'gsk_test_key_never_real_0000000000';
const BASE = { OPENAI_COMPAT_BASE_URL: 'https://api.groq.com/openai/v1', OPENAI_COMPAT_API_KEY: KEY };

test('GROQ_MODEL tiene prioridad; por defecto gpt-oss-120b con respaldo gpt-oss-20b', () => {
  const d = getOpenAiCompatConfig({});
  assert.equal(d.model, 'openai/gpt-oss-120b');
  assert.equal(d.fallbackModel, 'openai/gpt-oss-20b');
  assert.equal(getOpenAiCompatConfig({ OPENAI_COMPAT_MODEL: 'a/legacy' }).model, 'a/legacy');
  assert.equal(getOpenAiCompatConfig({ OPENAI_COMPAT_MODEL: 'a/legacy', GROQ_MODEL: 'b/new' }).model, 'b/new');
  assert.equal(getOpenAiCompatConfig({ GROQ_MODEL_FALLBACK: 'c/small' }).fallbackModel, 'c/small');
  assert.equal(getOpenAiCompatConfig({ GROQ_MODEL_FALLBACK: 'none' }).fallbackModel, '');
  // Respaldo igual al principal = sin respaldo (evita reintentar lo mismo).
  assert.equal(getOpenAiCompatConfig({ GROQ_MODEL: 'x/m', GROQ_MODEL_FALLBACK: 'x/m' }).fallbackModel, '');
});

test('solo 429/5xx/404/red disparan respaldo; abortos y 401/403/400 no', () => {
  assert.equal(shouldFallbackToSmallerModel({ status: 429 }), true);
  assert.equal(shouldFallbackToSmallerModel({ status: 503 }), true);
  assert.equal(shouldFallbackToSmallerModel({ status: 404 }), true);
  assert.equal(shouldFallbackToSmallerModel(new TypeError('fetch failed')), true);
  assert.equal(shouldFallbackToSmallerModel({ status: 401 }), false);
  assert.equal(shouldFallbackToSmallerModel({ status: 403 }), false);
  assert.equal(shouldFallbackToSmallerModel({ status: 400 }), false);
  assert.equal(shouldFallbackToSmallerModel(Object.assign(new Error('x'), { name: 'AbortError' })), false);
});

async function withFetch(impl: (url: string, init: any) => Promise<Response>, fn: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = impl as any;
  try { await fn(); } finally { globalThis.fetch = original; }
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('429 del modelo principal reintenta UNA vez con el modelo de respaldo', async () => {
  const models: string[] = [];
  await withFetch(async (_url, init) => {
    const body = JSON.parse(init.body);
    models.push(body.model);
    if (body.model === 'openai/gpt-oss-120b') return json(429, { error: { code: 'rate_limit_exceeded' } });
    return json(200, { model: body.model, choices: [{ message: { content: 'ok' } }] });
  }, async () => {
    const res = await openAiCompatChat({ messages: [{ role: 'user', content: 'hola' }] }, { ...BASE } as any);
    assert.equal(res.model, 'openai/gpt-oss-20b');
  });
  assert.deepEqual(models, ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']);
});

test('si el respaldo también falla se propaga el error (sin bucles) y 401 no reintenta', async () => {
  let calls = 0;
  await withFetch(async () => { calls++; return json(503, {}); }, async () => {
    await assert.rejects(openAiCompatChat({ messages: [{ role: 'user', content: 'x' }] }, { ...BASE } as any), (e: any) => e.status === 503);
  });
  assert.equal(calls, 2);
  calls = 0;
  await withFetch(async () => { calls++; return json(401, {}); }, async () => {
    await assert.rejects(openAiCompatChat({ messages: [{ role: 'user', content: 'x' }] }, { ...BASE } as any), (e: any) => e.status === 401);
  });
  assert.equal(calls, 1);
  calls = 0;
  await withFetch(async () => { calls++; return json(429, {}); }, async () => {
    await assert.rejects(openAiCompatChat({ messages: [{ role: 'user', content: 'x' }] }, { ...BASE, GROQ_MODEL_FALLBACK: 'off' } as any));
  });
  assert.equal(calls, 1);
});

test('el respaldo de Groq solo se hereda en el slot primario del router de capacidad', () => {
  const slots = capacitySlots({ ...BASE, GROQ_MODEL: 'openai/gpt-oss-120b', AI_FREE_FALLBACK_MODEL: 'vendor/model:free', AI_FREE_FALLBACK_API_KEY: KEY });
  const primary = slots.find(s => s.name === 'primary')!;
  const free = slots.find(s => s.name === 'free')!;
  assert.equal(primary.env.OPENAI_COMPAT_MODEL, 'openai/gpt-oss-120b');
  assert.equal(primary.env.GROQ_MODEL_FALLBACK, 'openai/gpt-oss-20b');
  assert.equal(getOpenAiCompatConfig(free.env).fallbackModel, '');
});
