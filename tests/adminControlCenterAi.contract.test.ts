import assert from 'node:assert/strict';
import test from 'node:test';
import { getAiCallStats, recordAiCallSample, resetAiCallSamples, callProvider, resetBreakers } from '../backend/aiRouter';
import { getAiEvidence } from '../backend/adminControlCenterService';

const T = Date.parse('2026-10-20T18:00:00.000Z');

test('sin muestras: nulls y estado unavailable (no se inventa salud)', () => {
  resetAiCallSamples();
  const s = getAiCallStats(T);
  assert.equal(s.total, 0);
  assert.equal(s.p50LatencyMs, null);
  assert.equal(s.p95LatencyMs, null);
  assert.equal(s.failureRate, null);
  const env = getAiEvidence(new Date(T));
  assert.equal(env.state, 'unavailable');
  assert.equal(env.value!.p95LatencyMs, null);
});

test('p50/p95 sobre llamadas exitosas y fallos por proveedor y motivo', () => {
  resetAiCallSamples();
  for (let i = 1; i <= 20; i++) recordAiCallSample({ at: T - i * 1000, provider: 'gemini', ok: true, latencyMs: i * 100 });
  recordAiCallSample({ at: T - 500, provider: 'openai_compat', ok: false, latencyMs: 50, reason: 'rate_limit' });
  recordAiCallSample({ at: T - 400, provider: 'openai_compat', ok: true, latencyMs: 300 });
  recordAiCallSample({ at: T - 25 * 3600_000, provider: 'claude', ok: false, latencyMs: 10, reason: 'timeout' }); // fuera de ventana
  const s = getAiCallStats(T);
  assert.equal(s.total, 22);
  assert.equal(s.failures, 1);
  assert.equal(s.p50LatencyMs, 1000);
  assert.equal(s.p95LatencyMs, 1900);
  assert.equal(s.byProvider.gemini.p95LatencyMs, 1900);
  assert.deepEqual(s.byProvider.openai_compat.reasons, { rate_limit: 1 });
  assert.equal(s.byProvider.openai_compat.failureRate, 50);
  assert.equal(s.byProvider.claude, undefined);
  const env = getAiEvidence(new Date(T));
  assert.equal(env.state, 'partial');
  assert.equal(env.source, 'aiRouter:instance_memory');
});

test('callProvider registra muestra de éxito y de fallo sin contenido del prompt', async () => {
  resetAiCallSamples(); resetBreakers();
  const saved = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key-never-a-real-key-000';
  try {
    await callProvider('gemini', 'concierge', async () => 'secreto del prompt');
    await assert.rejects(callProvider('gemini', 'concierge', async () => { throw Object.assign(new Error('bad'), { status: 401 }); }));
    const s = getAiCallStats();
    assert.equal(s.total, 2);
    assert.equal(s.failures, 1);
    assert.doesNotMatch(JSON.stringify(s), /secreto/);
  } finally {
    resetBreakers();
    if (saved === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = saved;
  }
});
