import assert from 'node:assert/strict';
import test from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/[...path]';

test('private gateway authenticates runtime requests and preserves user auth', async (t) => {
  const names = [
    'GCP_WIF_AUDIENCE',
    'GCP_PROJECT_NUMBER',
    'GCP_WIF_POOL_ID',
    'GCP_WIF_PROVIDER_ID',
    'GCP_WIF_SERVICE_ACCOUNT',
    'CLOUD_RUN_BACKEND_URL',
    'VERCEL_OIDC_TOKEN'
  ];
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

  async function invoke(options: {
    headers?: Record<string, string>;
    expectedToken?: string;
    path?: string;
    includeUserAuth?: boolean;
    expectedAudience?: string;
  } = {}) {
    const {
      headers = {},
      expectedToken,
      path = '/api/admin/access-policy',
      includeUserAuth = true,
      expectedAudience = process.env.GCP_WIF_AUDIENCE || '',
    } = options;

    now += 60 * 60_000;
    let calls = 0;
    globalThis.fetch = (async (input: any, init?: RequestInit) => {
      calls += 1;
      if (calls === 1) {
        assert.equal(String(input), 'https://sts.googleapis.com/v1/token');
        const tokenExchange = new URLSearchParams(String(init?.body));
        assert.equal(tokenExchange.get('subject_token'), expectedToken);
        assert.equal(tokenExchange.get('audience'), expectedAudience);
        assert.equal(tokenExchange.get('subject_token_type'), 'urn:ietf:params:oauth:token-type:jwt');
        return Response.json({ access_token: 'test-google-access' });
      }
      if (calls === 2) {
        assert.match(String(input), /:generateIdToken$/);
        return Response.json({ token: 'test-cloud-run-id' });
      }
      assert.equal(calls, 3);
      assert.equal(String(input), `https://backend.example.invalid${path}`);
      const forwarded = new Headers(init?.headers);
      if (includeUserAuth) assert.equal(forwarded.get('authorization'), 'Bearer test-user-id');
      assert.equal(forwarded.get('x-serverless-authorization'), 'Bearer test-cloud-run-id');
      assert.equal(forwarded.has('x-vercel-oidc-token'), false);
      return Response.json({ allowed: false }, { status: 403 });
    }) as typeof fetch;

    let status = 0;
    let payload: any;
    const responseHeaders = new Map<string, unknown>();
    const res = {
      setHeader(name: string, value: unknown) { responseHeaders.set(name.toLowerCase(), value); },
      status(value: number) { status = value; return this; },
      send(value: unknown) { payload = value; return this; },
      json(value: unknown) { payload = value; return this; },
    } as unknown as VercelResponse;

    const requestHeaders: Record<string, string> = { host: 'app.example.invalid', ...headers };
    if (includeUserAuth) requestHeaders.authorization = 'Bearer test-user-id';

    await handler({ method: 'GET', url: path, headers: requestHeaders } as VercelRequest, res);
    return { status, payload, calls, responseHeaders };
  }

  try {
    await t.test('runtime header works without an environment token', async () => {
      delete process.env.VERCEL_OIDC_TOKEN;
      const result = await invoke({ headers: { 'x-vercel-oidc-token': 'test-runtime-oidc' }, expectedToken: 'test-runtime-oidc' });
      assert.equal(result.status, 403);
      assert.equal(result.calls, 3);
      assert.equal(result.responseHeaders.get('cache-control'), 'no-store, max-age=0');
    });

    await t.test('runtime header takes precedence over a stale build token', async () => {
      process.env.VERCEL_OIDC_TOKEN = 'test-stale-build-oidc';
      const result = await invoke({ headers: { 'x-vercel-oidc-token': 'test-current-oidc' }, expectedToken: 'test-current-oidc' });
      assert.equal(result.status, 403);
    });

    await t.test('local environment fallback remains supported', async () => {
      process.env.VERCEL_OIDC_TOKEN = 'test-local-oidc';
      assert.equal((await invoke({ expectedToken: 'test-local-oidc' })).status, 403);
    });

    await t.test('missing identity fails closed without upstream requests', async () => {
      delete process.env.VERCEL_OIDC_TOKEN;
      const result = await invoke({});
      assert.equal(result.status, 503);
      assert.equal(result.payload.error, 'backend_gateway_unavailable');
      assert.equal(result.calls, 0);
    });

    await t.test('privileged routes reject anonymous callers before any Google or Cloud Run request', async () => {
      delete process.env.VERCEL_OIDC_TOKEN;
      const privilegedPaths = [
        '/api/automations/multi-day-planner',
        '/api/automations/dynamic-pricing',
        '/api/calendario/sincronizar',
        '/api/operadores/notificar',
        '/api/nps/despachar',
        '/api/reportes/semanal',
        '/api/agents/supervisor',
        '/api/agents/log_exception',
      ];
      for (const path of privilegedPaths) {
        const result = await invoke({ includeUserAuth: false, path });
        assert.equal(result.status, 401, path);
        assert.equal(result.payload.error, 'application_auth_required', path);
        assert.equal(result.calls, 0, path);
      }
    });

    await t.test('authenticated operational routes continue to reach the private backend', async () => {
      process.env.VERCEL_OIDC_TOKEN = 'test-ops-oidc';
      const result = await invoke({ path: '/api/automations/multi-day-planner', expectedToken: 'test-ops-oidc' });
      assert.equal(result.status, 403);
      assert.equal(result.calls, 3);
    });

    await t.test('retired legacy payment, customer confirmation and payout routes never reach upstream services', async () => {
      delete process.env.VERCEL_OIDC_TOKEN;
      for (const path of [
        '/api/pagos/solicitud',
        '/api/reservas/confirmar',
        '/api/payouts/run-batch',
        '/api/workflows/legacy-confirm',
        '/api/bookings/CRT-2026-001/customer-confirm?action=aprobado',
      ]) {
        const result = await invoke({ includeUserAuth: false, path });
        assert.equal(result.status, 410, path);
        assert.equal(result.payload.error, 'legacy_route_retired', path);
        assert.equal(result.calls, 0, path);
      }
    });

    await t.test('public API routes still use the zero-trust infrastructure identity', async () => {
      process.env.VERCEL_OIDC_TOKEN = 'test-public-oidc';
      const result = await invoke({ includeUserAuth: false, path: '/api/health', expectedToken: 'test-public-oidc' });
      assert.equal(result.status, 403);
      assert.equal(result.calls, 3);
    });

    await t.test('concurrent requests share identity refresh, preserve user isolation and recover after failure', async () => {
      now += 60 * 60_000;
      process.env.VERCEL_OIDC_TOKEN = 'test-concurrent-oidc';
      let exchanges = 0;
      let generations = 0;
      let failExchange = true;
      const users = new Set<string>();
      globalThis.fetch = (async (input: any, init?: RequestInit) => {
        if (String(input).includes('sts.googleapis.com')) {
          exchanges += 1;
          await new Promise(resolve => setImmediate(resolve));
          return failExchange
            ? Response.json({ error: 'temporarily_unavailable' }, { status: 503 })
            : Response.json({ access_token: 'test-concurrent-access' });
        }
        if (String(input).includes(':generateIdToken')) {
          generations += 1;
          return Response.json({ token: 'test-concurrent-id' });
        }
        const headers = new Headers(init?.headers);
        users.add(headers.get('authorization') || '');
        assert.equal(headers.get('x-serverless-authorization'), 'Bearer test-concurrent-id');
        return Response.json({ ok: true });
      }) as typeof fetch;
      async function request(index: number) {
        let status = 0;
        const res = {
          setHeader() {},
          status(code: number) { status = code; return this; },
          send() { return this; },
          json() { return this; },
        } as unknown as VercelResponse;
        await handler({ method: 'GET', url: '/api/health', headers: {
          authorization: `Bearer test-user-${index}`,
        }} as VercelRequest, res);
        return status;
      }
      assert.deepEqual(await Promise.all(Array.from({ length: 20 }, (_, i) => request(i))), Array(20).fill(503));
      assert.equal(exchanges, 1);
      assert.equal(generations, 0);
      assert.equal(users.size, 0);
      failExchange = false;
      assert.deepEqual(await Promise.all(Array.from({ length: 20 }, (_, i) => request(i))), Array(20).fill(200));
      assert.equal(exchanges, 2);
      assert.equal(generations, 1);
      assert.equal(users.size, 20);
      assert.equal(await request(21), 200);
      assert.equal(exchanges, 2, 'warm requests reuse the cached identity');
      now += 60 * 60_000;
      assert.equal(await request(22), 200);
      assert.equal(exchanges, 3, 'expired identities are refreshed');
    });

    await t.test('WIF audience can be derived from explicit provider identity pieces', async () => {
      delete process.env.GCP_WIF_AUDIENCE;
      process.env.GCP_PROJECT_NUMBER = '123456789';
      process.env.GCP_WIF_POOL_ID = 'vercel';
      process.env.GCP_WIF_PROVIDER_ID = 'vercel-production';
      process.env.VERCEL_OIDC_TOKEN = 'test-derived-oidc';
      const expectedAudience = '//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/vercel/providers/vercel-production';
      const result = await invoke({ includeUserAuth: false, path: '/api/health', expectedToken: 'test-derived-oidc', expectedAudience });
      assert.equal(result.status, 403);
      assert.equal(result.calls, 3);
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
