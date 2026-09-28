import assert from 'node:assert/strict';
import test from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import counterHandler from '../api/agent/counter';
import conciergeHandler from '../api/gemini/concierge';

test('public concierge facades normalize requests to the canonical concierge loop', async () => {
  const envNames = ['GCP_WIF_AUDIENCE', 'GCP_WIF_SERVICE_ACCOUNT', 'CLOUD_RUN_BACKEND_URL', 'VERCEL_OIDC_TOKEN'];
  const original = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
  const realFetch = globalThis.fetch;
  const realNow = Date.now;
  const realError = console.error;
  let now = realNow();
  Date.now = () => now;
  console.error = () => {};

  process.env.GCP_WIF_AUDIENCE = 'test-audience';
  process.env.GCP_WIF_SERVICE_ACCOUNT = 'gateway@example.invalid';
  process.env.CLOUD_RUN_BACKEND_URL = 'https://backend.example.invalid';
  process.env.VERCEL_OIDC_TOKEN = 'test-vercel-oidc';

  const upstreamBodies: any[] = [];
  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    const url = String(input);
    if (url === 'https://sts.googleapis.com/v1/token') {
      return Response.json({ access_token: 'google-access' });
    }
    if (url.includes('iamcredentials.googleapis.com') && url.endsWith(':generateIdToken')) {
      return Response.json({ token: 'cloud-run-id-token' });
    }
    if (url === 'https://backend.example.invalid/api/gemini/concierge') {
      upstreamBodies.push(JSON.parse(String(init?.body || '{}')));
      return Response.json({
        success: true,
        reply: 'Solicitud recibida. La disponibilidad y la confirmación se verifican durante el proceso de reserva.',
        quickActions: []
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  function makeResponse() {
    let statusCode = 200;
    let payload: any;
    const headers = new Map<string, unknown>();
    const response = {
      setHeader(name: string, value: unknown) { headers.set(name.toLowerCase(), value); },
      status(value: number) { statusCode = value; return this; },
      send(value: unknown) { payload = value; return this; },
      json(value: unknown) { payload = value; return this; },
    } as unknown as VercelResponse;
    return { response, getStatus: () => statusCode, getPayload: () => payload };
  }

  try {
    const counterRes = makeResponse();
    await counterHandler({
      method: 'POST',
      url: '/api/agent/counter',
      headers: { host: 'app.example.invalid' },
      body: {
        message: 'Quiero reservar Arenal',
        language: 'es',
        agentId: 'counter_agent',
        engine: 'claude',
        history: Array.from({ length: 20 }, (_, i) => ({ role: 'user', text: `m${i}` }))
      }
    } as VercelRequest, counterRes.response);

    assert.equal(counterRes.getStatus(), 200);
    assert.equal(upstreamBodies.length, 1);
    assert.equal(upstreamBodies[0].agentId, 'concierge');
    assert.equal(upstreamBodies[0].engine, 'auto');
    assert.equal(upstreamBodies[0].history.length, 12);
    assert.equal(upstreamBodies[0].message, 'Quiero reservar Arenal');

    // Expire the cached Cloud Run ID token so the second facade exercises the
    // complete authentication chain independently.
    now += 60 * 60_000;

    const conciergeRes = makeResponse();
    await conciergeHandler({
      method: 'POST',
      url: '/api/gemini/concierge',
      headers: { host: 'app.example.invalid' },
      body: {
        message: 'Necesito disponibilidad para Manuel Antonio',
        language: 'es',
        agentId: 'counter_agent',
        engine: 'claude'
      }
    } as VercelRequest, conciergeRes.response);

    assert.equal(conciergeRes.getStatus(), 200);
    assert.equal(upstreamBodies.length, 2);
    assert.equal(upstreamBodies[1].agentId, 'concierge');
    assert.equal(upstreamBodies[1].engine, 'auto');
    assert.equal(upstreamBodies[1].message, 'Necesito disponibilidad para Manuel Antonio');

    const methodRes = makeResponse();
    await counterHandler({ method: 'GET', url: '/api/agent/counter', headers: {} } as VercelRequest, methodRes.response);
    assert.equal(methodRes.getStatus(), 405);
  } finally {
    globalThis.fetch = realFetch;
    Date.now = realNow;
    console.error = realError;
    for (const name of envNames) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  }
});
