import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import chatHandler from '../api/ai/chat';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const floating = readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

test('AI chat facade preserves nonenumerable IncomingMessage headers and forwards only minimal request body', async () => {
  const keys = ['GCP_WIF_AUDIENCE', 'GCP_WIF_SERVICE_ACCOUNT', 'CLOUD_RUN_BACKEND_URL', 'VERCEL_OIDC_TOKEN'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const oldFetch = globalThis.fetch;
  const supplied = {
    host: 'costaricatours2026.vercel.app',
    'x-vercel-oidc-token': 'test-oidc-from-getter',
    authorization: 'Bearer traveler-token'
  };
  let calls = 0;
  const result: { status: number; body: unknown } = { status: 0, body: null };

  try {
    process.env.GCP_WIF_AUDIENCE = 'test-audience';
    process.env.GCP_WIF_SERVICE_ACCOUNT = 'gateway@example.invalid';
    process.env.CLOUD_RUN_BACKEND_URL = 'https://backend.example.invalid';
    delete process.env.VERCEL_OIDC_TOKEN;
    globalThis.fetch = (async (url: any, init?: RequestInit) => {
      calls++;
      if (calls === 1) {
        assert.equal(String(url), 'https://sts.googleapis.com/v1/token');
        assert.equal(new URLSearchParams(String(init?.body)).get('subject_token'), supplied['x-vercel-oidc-token']);
        return Response.json({ access_token: 'test-cloud-access' });
      }
      if (calls === 2) {
        assert.match(String(url), /:generateIdToken$/);
        return Response.json({ token: 'test-cloud-id' });
      }
      assert.equal(calls, 3);
      assert.equal(String(url), 'https://backend.example.invalid/api/gemini/concierge');
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('authorization'), 'Bearer traveler-token');
      assert.equal(headers.get('x-serverless-authorization'), 'Bearer test-cloud-id');
      assert.equal(headers.has('x-vercel-oidc-token'), false);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.message, '¿Hay tours disponibles?');
      assert.equal(body.agentId, 'concierge');
      assert.equal(body.language, 'es');
      assert.equal(body.sessionId, 'audit-session');
      return Response.json({ reply: 'La disponibilidad requiere verificación' });
    }) as typeof fetch;

    // IncomingMessage.headers is an accessor in Node.js, not necessarily an own
    // enumerable field; spreading this request used to drop the OIDC token.
    const request = Object.assign(Object.create({
      get headers() { return supplied; }
    }), {
      method: 'POST',
      url: '/api/ai/chat',
      body: { message: '¿Hay tours disponibles?', language: 'es', sessionId: 'audit-session' }
    }) as VercelRequest;
    assert.equal(Object.prototype.hasOwnProperty.call(request, 'headers'), false);
    const response = {
      setHeader() { return this; },
      status(code: number) { result.status = code; return this; },
      send(value: unknown) { result.body = value; return this; },
      json(value: unknown) { result.body = value; return this; }
    } as unknown as VercelResponse;

    await chatHandler(request, response);
    assert.equal(result.status, 200);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test('floating assistant does not convert failed HTTP responses into success messages', () => {
  assert.match(floating, /if \(!response\.ok \|\| data\.success === false \|\| data\.error\)/);
  assert.match(floating, /throw new Error\('AI chat request failed'\)/);
  assert.match(floating, /catch \(error\)/);
});
