import assert from 'node:assert/strict';
import test from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/[...path]';

test('private gateway authenticates runtime requests and preserves user auth', async (t) => {
  const names = ['GCP_WIF_AUDIENCE', 'GCP_WIF_SERVICE_ACCOUNT', 'CLOUD_RUN_BACKEND_URL', 'VERCEL_OIDC_TOKEN'];
  const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const realFetch = globalThis.fetch;
  const realNow = Date.now;
  const realError = console.error;
  let now = realNow();
  Date.now = () => now;
  console.error = () => {};
  process.env.GCP_WIF_AUDIENCE = 'test-audience';
  process.env.GCP_WIF_SERVICE_ACCOUNT = 'gateway@example.invalid';
  process.env.CLOUD_RUN_BACKEND_URL = 'https://backend.example.invalid';

  async function invoke(headers: Record<string, string>, expectedToken?: string) {
    now += 60 * 60_000; // Expire the module cache between independent scenarios.
    let calls = 0;
    globalThis.fetch = (async (input: any, init?: RequestInit) => {
      calls += 1;
      if (calls === 1) {
        assert.equal(String(input), 'https://sts.googleapis.com/v1/token');
        assert.equal(new URLSearchParams(String(init?.body)).get('subject_token'), expectedToken);
        return Response.json({ access_token: 'test-google-access' });
      }
      if (calls === 2) {
        assert.match(String(input), /:generateIdToken$/);
        return Response.json({ token: 'test-cloud-run-id' });
      }
      assert.equal(calls, 3);
      assert.equal(String(input), 'https://backend.example.invalid/api/admin/access-policy');
      const forwarded = new Headers(init?.headers);
      assert.equal(forwarded.get('authorization'), 'Bearer test-user-id');
      assert.equal(forwarded.get('x-serverless-authorization'), 'Bearer test-cloud-run-id');
      assert.equal(forwarded.has('x-vercel-oidc-token'), false);
      return Response.json({ allowed: false }, { status: 403 });
    }) as typeof fetch;
    let status = 0;
    let payload: any;
    const res = {
      setHeader() {},
      status(value: number) { status = value; return this; },
      send(value: unknown) { payload = value; return this; },
      json(value: unknown) { payload = value; return this; },
    } as unknown as VercelResponse;
    await handler({
      method: 'GET', url: '/api/admin/access-policy',
      headers: { host: 'app.example.invalid', authorization: 'Bearer test-user-id', ...headers },
    } as VercelRequest, res);
    return { status, payload, calls };
  }

  try {
    await t.test('runtime header works without an environment token', async () => {
      delete process.env.VERCEL_OIDC_TOKEN;
      const result = await invoke({ 'x-vercel-oidc-token': 'test-runtime-oidc' }, 'test-runtime-oidc');
      assert.equal(result.status, 403); // Preserve the backend's denial, never grant access.
      assert.equal(result.calls, 3);
    });
    await t.test('runtime header takes precedence over a stale build token', async () => {
      process.env.VERCEL_OIDC_TOKEN = 'test-stale-build-oidc';
      const result = await invoke({ 'x-vercel-oidc-token': 'test-current-oidc' }, 'test-current-oidc');
      assert.equal(result.status, 403);
    });
    await t.test('local environment fallback remains supported', async () => {
      process.env.VERCEL_OIDC_TOKEN = 'test-local-oidc';
      assert.equal((await invoke({}, 'test-local-oidc')).status, 403);
    });
    await t.test('missing identity fails closed without upstream requests', async () => {
      delete process.env.VERCEL_OIDC_TOKEN;
      const result = await invoke({});
      assert.equal(result.status, 503);
      assert.equal(result.payload.error, 'backend_gateway_unavailable');
      assert.equal(result.calls, 0);
    });
  } finally {
    globalThis.fetch = realFetch;
    Date.now = realNow;
    console.error = realError;
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  }
});
