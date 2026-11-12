import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import chatHandler from '../api/ai/chat';
import conciergeHandler from '../api/gemini/concierge';
import { configureVercelRuntimeEnv, runConciergeInProcess } from '../backend/vercel/conciergeRuntime';

const AI_ENV = ['AI_PROVIDER', 'OPENAI_COMPAT_BASE_URL', 'OPENAI_COMPAT_API_KEY', 'GROQ_MODEL', 'GROQ_MODEL_FALLBACK', 'GEMINI_API_KEY', 'CLAUDE_MODEL', 'ANTHROPIC_VERTEX_MODEL', 'CONCIERGE_UPSTREAM', 'CLOUD_RUN_BACKEND_URL'];

async function withEnv(values: Record<string, string | undefined>, fn: () => Promise<void>) {
  const original = Object.fromEntries(AI_ENV.map(k => [k, process.env[k]]));
  for (const k of AI_ENV) delete process.env[k];
  for (const [k, v] of Object.entries(values)) if (v !== undefined) process.env[k] = v;
  try { await fn(); } finally {
    for (const k of AI_ENV) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
  }
}

function makeResponse() {
  const out: { status: number; body: any; headers: Map<string, unknown> } = { status: 200, body: undefined, headers: new Map() };
  const response = {
    setHeader(name: string, value: unknown) { out.headers.set(name.toLowerCase(), value); return this; },
    status(code: number) { out.status = code; return this; },
    send(value: unknown) { out.body = value; return this; },
    json(value: unknown) { out.body = value; return this; },
  } as unknown as VercelResponse;
  return { response, out };
}

test('Vercel runtime: sin credencial de Firebase, Firestore y leads quedan apagados (sin ADC)', () => {
  const env: NodeJS.ProcessEnv = {};
  configureVercelRuntimeEnv(env);
  assert.equal(env.CRT_FIRESTORE_ADMIN_DISABLED, 'true');
  assert.equal(env.LEADS_PIPELINE_ENABLED, 'false');
  const withKey: NodeJS.ProcessEnv = { FIREBASE_SERVICE_ACCOUNT: '{"project_id":"x"}' };
  configureVercelRuntimeEnv(withKey);
  assert.equal(withKey.CRT_FIRESTORE_ADMIN_DISABLED, undefined);
  assert.equal(withKey.LEADS_PIPELINE_ENABLED, undefined);
  const bookingService = fs.readFileSync('backend/bookingService.ts', 'utf8');
  assert.match(bookingService, /CRT_FIRESTORE_ADMIN_DISABLED === 'true'\) return null;/);
});

test('sin clave de IA, una emergencia responde 911 en proceso (ES/EN), sin Cloud Run', async () => {
  await withEnv({}, async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: any) => { throw new Error(`fetch inesperado: ${String(input)}`); }) as typeof fetch;
    try {
      const es = makeResponse();
      await chatHandler({ method: 'POST', url: '/api/ai/chat', headers: {}, body: { message: 'Emergencia, me siento mal, necesito un hospital', language: 'es' } } as unknown as VercelRequest, es.response);
      assert.equal(es.out.status, 200);
      assert.equal(es.out.headers.get('x-crt-concierge-runtime'), 'vercel-in-process');
      assert.match(es.out.body.reply, /911/);
      assert.equal(es.out.body.success, true);

      const en = makeResponse();
      await conciergeHandler({ method: 'POST', url: '/api/gemini/concierge', headers: {}, body: { message: 'I need a hospital, emergency', language: 'en' } } as unknown as VercelRequest, en.response);
      assert.equal(en.out.status, 200);
      assert.match(en.out.body.reply, /call 911/);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

test('con Groq (openai_compat) configurado, el bucle canónico responde con el modelo y redacta contactos', async () => {
  await withEnv({
    AI_PROVIDER: 'openai_compat',
    OPENAI_COMPAT_BASE_URL: 'https://api.groq.example.invalid/openai/v1',
    OPENAI_COMPAT_API_KEY: 'test-key-0123456789abcdefghij',
    GROQ_MODEL: 'openai/gpt-oss-120b',
    GROQ_MODEL_FALLBACK: 'none',
  }, async () => {
    const realFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith('/chat/completions')) {
        return Response.json({
          model: 'openai/gpt-oss-120b',
          choices: [{ message: { role: 'assistant', content: 'Monteverde es ideal para bosque nuboso. Contacto: hotel@ejemplo.com +506 8888-1234' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 10 },
        });
      }
      throw new Error(`fetch inesperado: ${url}`);
    }) as typeof fetch;
    try {
      const result = await runConciergeInProcess({ message: '¿Qué me recomiendas en Monteverde?', language: 'es', history: [], context: {}, agentId: 'concierge', engine: 'auto' });
      assert.equal(result.status, 200);
      assert.ok(calls.some(u => u.startsWith('https://api.groq.example.invalid/openai/v1/chat/completions')), calls.join(','));
      assert.match(result.body.reply, /Monteverde/);
      assert.doesNotMatch(result.body.reply, /hotel@ejemplo\.com|8888-1234/);
      assert.equal(result.body.modelUsed, 'openai/gpt-oss-120b');
      assert.equal(result.body.source, 'openai/gpt-oss-120b');
      assert.ok(!calls.some(u => /googleapis|run\.app|metadata/.test(u)), 'no debe tocar GCP');
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

test('si el motor no responde a tiempo, se devuelve la respuesta determinista', async () => {
  await withEnv({
    AI_PROVIDER: 'openai_compat',
    OPENAI_COMPAT_BASE_URL: 'https://api.groq.example.invalid/openai/v1',
    OPENAI_COMPAT_API_KEY: 'test-key-0123456789abcdefghij',
  }, async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = ((_input: any, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })) as typeof fetch;
    try {
      const result = await runConciergeInProcess({ message: 'emergencia, necesito un médico', language: 'es', history: [] }, {}, { deadlineMs: 50 });
      assert.equal(result.status, 200);
      assert.match(result.body.reply, /911/);
      assert.equal(result.body.aiAvailable, false);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

test('CONCIERGE_UPSTREAM=cloud_run conserva el proxy histórico; el gateway no se modificó', () => {
  for (const file of ['api/ai/chat.ts', 'api/gemini/concierge.ts']) {
    const src = fs.readFileSync(file, 'utf8');
    assert.match(src, /if \(!conciergeUsesCloudRun\(\)\) return respondInProcess\(req, res, conciergeBody\);/, file);
    assert.match(src, /from '\.\.\/_conciergeInProcess\.js'/, file);
    assert.match(src, /return gatewayHandler\(proxyReq, res\);/, file);
  }
  const facade = fs.readFileSync('api/_conciergeInProcess.ts', 'utf8');
  assert.match(facade, /import\('\.\/_lib\/conciergeRuntime\.mjs'\)/);
});

test('bundle de Vercel generado: existe, es ESM y no contiene datos de operadores ni secretos', async () => {
  const bundlePath = 'api/_lib/conciergeRuntime.mjs';
  const src = fs.readFileSync(bundlePath, 'utf8');
  assert.match(src, /^\/\/ GENERADO por npm run build:concierge-runtime/);
  assert.match(src, /export \{[^}]*runConciergeInProcess/);
  assert.doesNotMatch(src, /operatorTourSources\.json"\s*with|BEGIN PRIVATE KEY|sk_live_|gsk_[A-Za-z0-9]{20,}/);
  assert.doesNotMatch(src, /from "\.\.?\//, 'sin imports relativos: Vercel ejecuta ESM sin resolver extensiones');
  // El almacén de datos internos de operadores nunca entra en una función pública.
  assert.doesNotMatch(src, /internalDataStore|internal_operators/);
  assert.match(src, /backend\/vercel\/internalDataUnavailable\.ts/);
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts['build:concierge-runtime'], 'node scripts/buildConciergeRuntime.mjs');
  const script = fs.readFileSync('scripts/buildConciergeRuntime.mjs', 'utf8');
  assert.match(script, /outfile: 'api\/_lib\/conciergeRuntime\.mjs'/);
  assert.match(pkg.scripts.build, /npm run build:concierge-runtime/);
  const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  for (const fn of ['api/ai/chat.ts', 'api/gemini/concierge.ts']) {
    assert.equal(vercel.functions?.[fn]?.maxDuration, 60, fn);
    assert.match(String(vercel.functions?.[fn]?.includeFiles), /public\/data\/mapa/, fn);
  }
});
