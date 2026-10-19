import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import { aiHealthHttpStatus, classifyAiFailure, getAiHealth, resetAiObservations } from '../backend/aiHealth';
import {
  AiUnavailableError, callProvider, getBreakerStates, isBreakerOpen, redactContents, redactPii, resetBreakers, runGenerative,
} from '../backend/aiRouter';
import { getAiConfig, getClaudeModel, getConciergeModel, getLightModel, isBillingBlocked, providerOrder } from '../backend/aiConfig';
import { healthRouter } from '../backend/routes/misc';

const AI_ENV_KEYS = ['GEMINI_API_KEY', 'GOOGLE_GENAI_USE_VERTEXAI', 'ANTHROPIC_VERTEX_MODEL', 'CLAUDE_MODEL', 'ANTHROPIC_VERTEX_PROJECT_ID',
  'GCP_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'AI_PROVIDER', 'AI_FALLBACK_ENABLED', 'AI_MAX_COST_USD', 'AI_BILLABLE_PROVIDERS',
  'AI_ALLOW_EXTERNAL_PII', 'AI_REQUEST_TIMEOUT_MS', 'GEMINI_MODEL', 'GEMINI_MODEL_LIGHT',
  'OPENAI_COMPAT_BASE_URL', 'OPENAI_COMPAT_API_KEY', 'OPENAI_COMPAT_MODEL'];

async function withEnv(env: Record<string, string>, run: () => Promise<void> | void) {
  const saved = Object.fromEntries(AI_ENV_KEYS.map(k => [k, process.env[k]]));
  for (const k of AI_ENV_KEYS) delete process.env[k];
  Object.assign(process.env, env);
  resetBreakers();
  resetAiObservations();
  try { await run(); } finally {
    for (const k of AI_ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
    resetBreakers();
  }
}

const FAKE_KEY = 'test-key-never-a-real-key-000';

test('classification covers 401/402/403/404/429/5xx/timeout and billing text', () => {
  const cases: Array<[unknown, string]> = [
    [{ status: 401, message: 'x' }, 'authentication'],
    [{ status: 402, message: 'x' }, 'billing'],
    [{ status: 429, message: 'Your prepayment credits are depleted' }, 'billing'],
    [{ status: 400, message: 'billing account disabled' }, 'billing'],
    [{ status: 403, message: 'x' }, 'permission'],
    [{ status: 404, message: 'x' }, 'model_unavailable'],
    [{ status: 429, message: 'x' }, 'quota'],
    [{ status: 500, message: 'x' }, 'provider_error'],
    [{ status: 503, message: 'x' }, 'provider_error'],
    [{ status: 504, message: 'x' }, 'timeout'],
    [{ name: 'AbortError', message: 'This operation was aborted' }, 'timeout'],
    [{ status: 408, message: 'AI request timed out' }, 'timeout'],
  ];
  for (const [error, expected] of cases) assert.equal(classifyAiFailure(error), expected, JSON.stringify(error));
});

test('defaults: concierge model from #255, light model keeps the historical internal default, zero cost', async () => {
  await withEnv({}, () => {
    const cfg = getAiConfig();
    assert.equal(cfg.provider, 'auto');
    assert.equal(cfg.fallbackEnabled, true);
    assert.equal(cfg.maxCostUsd, 0);
    assert.equal(cfg.allowExternalPii, false);
    assert.equal(cfg.requestTimeoutMs, 12000);
    assert.match(getConciergeModel(), /^gemini-/);
    assert.match(getLightModel(), /^gemini-/);
    assert.match(getClaudeModel(), /^claude-/);
  });
  await withEnv({ GEMINI_MODEL: 'm-main' }, () => assert.equal(getLightModel(), 'm-main'));
  await withEnv({ GEMINI_MODEL: 'm-main', GEMINI_MODEL_LIGHT: 'm-light' }, () => assert.equal(getLightModel(), 'm-light'));
  await withEnv({ ANTHROPIC_VERTEX_MODEL: 'c-vertex' }, () => assert.equal(getClaudeModel(), 'c-vertex'));
});

test('AI_MAX_COST_USD=0 only disables providers the operator marks billable; AI_PROVIDER=none does not block', async () => {
  await withEnv({ GEMINI_API_KEY: FAKE_KEY, AI_PROVIDER: 'none' }, () => assert.deepEqual(providerOrder(), ['gemini']));
  await withEnv({ GEMINI_API_KEY: FAKE_KEY, AI_BILLABLE_PROVIDERS: 'gemini' }, () => {
    assert.equal(isBillingBlocked('gemini'), true);
    assert.deepEqual(providerOrder(), []);
  });
  await withEnv({ GEMINI_API_KEY: FAKE_KEY, AI_BILLABLE_PROVIDERS: 'gemini', AI_MAX_COST_USD: '5' }, () => assert.deepEqual(providerOrder(), ['gemini']));
});

test('breaker opens on quota, blocks calls during cooldown and recovers', async () => {
  await withEnv({ GEMINI_API_KEY: FAKE_KEY }, async () => {
    let t = 1_000_000;
    const now = () => t;
    let calls = 0;
    await assert.rejects(callProvider('gemini', 'internal', async () => { calls++; throw { status: 429, message: 'quota' }; }, { now }));
    assert.equal(calls, 1, 'quota is not retried');
    assert.equal(isBreakerOpen('gemini', t), true);
    await assert.rejects(callProvider('gemini', 'internal', async () => { calls++; return 'ok'; }, { now }), (e: unknown) => e instanceof AiUnavailableError && e.reason === 'breaker_open');
    assert.equal(calls, 1, 'no call while the breaker is open');
    t += 5 * 60_000 + 1;
    assert.equal(await callProvider('gemini', 'internal', async () => { calls++; return 'ok'; }, { now }), 'ok');
    assert.equal(isBreakerOpen('gemini', t), false);
  });
});

test('billing/auth open 30 min; 5xx retries exactly once then opens 1 min', async () => {
  await withEnv({ GEMINI_API_KEY: FAKE_KEY }, async () => {
    let t = 2_000_000;
    const now = () => t;
    await assert.rejects(callProvider('gemini', 'internal', async () => { throw { status: 402, message: 'x' }; }, { now }));
    assert.equal(isBreakerOpen('gemini', t + 29 * 60_000), true);
    assert.equal(isBreakerOpen('gemini', t + 30 * 60_000 + 1), false);
    resetBreakers();
    let calls = 0;
    await assert.rejects(callProvider('gemini', 'internal', async () => { calls++; throw { status: 503, message: 'x' }; }, { now }));
    assert.equal(calls, 2);
    assert.equal(isBreakerOpen('gemini', t + 59_000), true);
    assert.equal(isBreakerOpen('gemini', t + 60_001), false);
  });
});

test('timeout aborts the request and grounding failures do not take down the provider', async () => {
  await withEnv({ GEMINI_API_KEY: FAKE_KEY }, async () => {
    let aborted = 0;
    await assert.rejects(callProvider('gemini', 'internal', (signal) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => { aborted++; reject(new Error('aborted')); });
    }), { timeoutMs: 20 }), (e: any) => classifyAiFailure(e) === 'timeout');
    assert.equal(aborted, 2, 'one retry, no loops');
    resetBreakers();
    await assert.rejects(callProvider('gemini:search', 'grounded_search', async () => { throw { status: 403, message: 'x' }; }));
    assert.equal(isBreakerOpen('gemini:search'), true);
    assert.equal(isBreakerOpen('gemini'), false);
    const states = getBreakerStates();
    assert.equal(states.find(s => s.provider === 'gemini:search')?.state, 'open');
    assert.equal(states.find(s => s.provider === 'gemini')?.state, 'closed');
  });
});

test('PII redaction: emails, phones and document numbers; keeps prices, dates and signatures', () => {
  const out = redactPii('Soy ana.perez@example.com, tel +506 8795-9148, cédula 1-0234-0567, pasaporte A1234567, rafting $95 el 2026-10-15 CRT-ABC123');
  assert.doesNotMatch(out, /ana\.perez|8795|0234-0567|A1234567/);
  assert.match(out, /\$95/);
  assert.match(out, /2026-10-15/);
  assert.match(out, /CRT-ABC123/);
  const contents: any[] = [{ role: 'model', parts: [{ functionCall: { name: 'lookup_booking', args: { email: 'x@y.com' } }, thoughtSignature: 'c2lnMTIzNDU2Nzg5MDEyMw==' }] },
    { role: 'user', parts: [{ functionResponse: { id: 'c1', name: 'lookup_booking', response: { result: { email: 'x@y.com', phone: '88887777' } } } }] }];
  const red = redactContents(contents) as any;
  assert.equal(red[0].parts[0].thoughtSignature, contents[0].parts[0].thoughtSignature);
  assert.equal(red[0].parts[0].functionCall.name, 'lookup_booking');
  assert.equal(red[1].parts[0].functionResponse.name, 'lookup_booking');
  assert.doesNotMatch(JSON.stringify(red), /x@y\.com|88887777/);
});

test('no hand-written model literal outside aiConfig.ts', () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) { if (name !== 'node_modules') walk(path); continue; }
      if (!/\.(ts|mts|cts|js|mjs)$/.test(name) || path.endsWith(join('backend', 'aiConfig.ts'))) continue;
      readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
        if (/\b(?:gemini|claude)-(?:\d|embedding|pro\b|flash|sonnet|opus|haiku)/i.test(line)) offenders.push(`${path}:${i + 1}`);
      });
    }
  };
  walk('backend');
  walk('api');
  assert.deepEqual(offenders, []);
});

test('without configuration the router returns provider none (deterministic fallback)', async () => {
  await withEnv({}, async () => {
    const result = await runGenerative({ task: 'concierge', contents: 'Quiero rafting en Arenal', containsPii: true });
    assert.equal(result.provider, 'none');
  });
});

test('/api/health/ai answers 200 for unknown/unconfigured, 503 only when every configured provider is degraded', async () => {
  assert.equal(aiHealthHttpStatus([{ status: 'unknown' }, { status: 'unconfigured' }]), 200);
  assert.equal(aiHealthHttpStatus([{ status: 'unconfigured' }, { status: 'unconfigured' }]), 200);
  assert.equal(aiHealthHttpStatus([{ status: 'available' }, { status: 'degraded' }]), 200);
  assert.equal(aiHealthHttpStatus([{ status: 'degraded' }, { status: 'unknown' }]), 200);
  assert.equal(aiHealthHttpStatus([{ status: 'degraded' }, { status: 'unconfigured' }]), 503);
  await withEnv({}, () => assert.equal(getAiHealth().status, 'unconfigured'));
  await withEnv({ GEMINI_API_KEY: FAKE_KEY }, async () => {
    const app = express();
    app.use(healthRouter);
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address() as AddressInfo;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health/ai`);
      assert.equal(res.status, 200);
      const text = await res.text();
      const body = JSON.parse(text);
      assert.equal(body.status, 'unknown');
      assert.ok(Array.isArray(body.breakers));
      assert.doesNotMatch(text, /test-key|@/);
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
