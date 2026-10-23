import assert from 'node:assert/strict';
import test from 'node:test';
import { getAiHealth, recordAiObservation, resetAiObservations } from '../backend/aiHealth';
import { isAiHealthProbeEnabled, probeAiProviders, probeTargets, resetAiHealthProbe, PROBE_INTERVAL_MS } from '../backend/aiHealthProbe';

const KEY = 'test-key-never-a-real-key-0123456789';
const env = { NODE_ENV: 'production', GEMINI_API_KEY: KEY } as unknown as NodeJS.ProcessEnv;
const fresh = () => { resetAiObservations(); resetAiHealthProbe(); };

test('interruptor: apagado con AI_HEALTH_PROBE_ENABLED=false y nunca en tests por defecto', () => {
  assert.equal(isAiHealthProbeEnabled({ NODE_ENV: 'production' } as any), true);
  assert.equal(isAiHealthProbeEnabled({ NODE_ENV: 'production', AI_HEALTH_PROBE_ENABLED: 'false' } as any), false);
  assert.equal(isAiHealthProbeEnabled({ NODE_ENV: 'test' } as any), false);
});

test('solo consulta el listado de modelos (GET, costo cero) y la clave va en cabecera, no en la URL', () => {
  const targets = probeTargets({ ...env, OPENAI_COMPAT_BASE_URL: 'https://api.groq.com/openai/v1', OPENAI_COMPAT_API_KEY: KEY } as any);
  assert.deepEqual(targets.map(t => t.provider), ['gemini', 'openai_compat']);
  for (const t of targets) {
    assert.match(t.url, /\/models(\?|$)/);
    assert.doesNotMatch(t.url, /key=|generateContent|completions/);
  }
});

test('respuesta OK → available (deja de ser unknown)', async () => {
  fresh();
  const calls: string[] = [];
  await probeAiProviders({ env, fetchImpl: async (url, init) => { calls.push(`${init.method} ${url}`); return { ok: true, status: 200 }; } });
  assert.equal(calls.length, 1);
  assert.equal(getAiHealth(env).status, 'available');
});

test('401 → degraded por authentication', async () => {
  fresh();
  await probeAiProviders({ env, fetchImpl: async () => ({ ok: false, status: 401 }) });
  const h = getAiHealth(env);
  assert.equal(h.status, 'degraded');
  assert.equal(h.providers.find(p => p.provider === 'gemini')?.reason, 'authentication');
});

test('timeout → degraded por timeout, sin lanzar', async () => {
  fresh();
  await probeAiProviders({ env, timeoutMs: 20, fetchImpl: (_u, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))) });
  assert.equal(getAiHealth(env).providers.find(p => p.provider === 'gemini')?.reason, 'timeout');
});

test('como máximo un sondeo por intervalo', async () => {
  fresh();
  let n = 0;
  const fetchImpl = async () => { n++; return { ok: true, status: 200 }; };
  await probeAiProviders({ env, fetchImpl, now: 1_000_000 });
  await probeAiProviders({ env, fetchImpl, now: 1_000_000 + 1000 });
  assert.equal(n, 1);
  resetAiObservations();
  await probeAiProviders({ env, fetchImpl, now: 1_000_000 + PROBE_INTERVAL_MS });
  assert.equal(n, 2);
});

test('no pisa una observación real reciente (fallo de facturación al generar)', async () => {
  fresh();
  recordAiObservation('gemini', 'billing');
  let n = 0;
  await probeAiProviders({ env, fetchImpl: async () => { n++; return { ok: true, status: 200 }; } });
  assert.equal(n, 0);
  assert.equal(getAiHealth(env).providers.find(p => p.provider === 'gemini')?.reason, 'billing');
});

test('sin proveedores configurados no hace nada', async () => {
  fresh();
  let n = 0;
  await probeAiProviders({ env: { NODE_ENV: 'production' } as any, fetchImpl: async () => { n++; return { ok: true, status: 200 }; } });
  assert.equal(n, 0);
});
