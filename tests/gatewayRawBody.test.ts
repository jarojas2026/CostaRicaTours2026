import assert from 'node:assert/strict';
import test from 'node:test';
import gateway from '../api/[...path]';

test('Web gateway preserves signed JSON, form data and query strings byte for byte', async () => {
  const keys = ['GCP_WIF_AUDIENCE', 'GCP_WIF_SERVICE_ACCOUNT', 'CLOUD_RUN_BACKEND_URL'];
  const original = keys.map(key => process.env[key]);
  const realFetch = globalThis.fetch;
  const realNow = Date.now;
  process.env.GCP_WIF_AUDIENCE = 'test-audience';
  process.env.GCP_WIF_SERVICE_ACCOUNT = 'gateway@example.invalid';
  process.env.CLOUD_RUN_BACKEND_URL = 'https://backend.example.invalid';
  let now = realNow();
  Date.now = () => now;
  try {
    for (const item of [
      { path: '/api/webhooks/stripe?source=test', type: 'application/json', body: '{ "amount": 100.00, "message": "Pura vida" }\n' },
      { path: '/api/webhooks/whatsapp', type: 'application/json', body: '{\n  "entry": []\n}' },
      { path: '/api/voice/incoming', type: 'application/x-www-form-urlencoded', body: 'From=%2B50612345678&SpeechResult=Pura+vida&Digits=0' },
      { path: '/api/bookings', type: 'application/json', body: '{"tourId":"test","adults":2}' }
    ]) {
      now += 60 * 60_000;
      let upstreamCalls = 0;
      globalThis.fetch = (async (input: any, init?: RequestInit) => {
        if (String(input).includes('sts.googleapis.com')) return Response.json({ access_token: 'test-access' });
        if (String(input).includes('iamcredentials.googleapis.com')) return Response.json({ token: 'test-id-token' });
        upstreamCalls++;
        assert.equal(String(input), 'https://backend.example.invalid' + item.path);
        assert.equal(Buffer.from(init?.body as any).toString('utf8'), item.body);
        const headers = new Headers(init?.headers);
        assert.equal(headers.get('content-type'), item.type);
        assert.equal(headers.get('stripe-signature'), 'test-signature');
        assert.equal(headers.has('x-vercel-oidc-token'), false);
        return Response.json({ received: true }, { status: 202 });
      }) as typeof fetch;
      const result = await gateway.fetch(new Request('https://app.example.invalid' + item.path, {
        method: 'POST',
        headers: { 'content-type': item.type, 'stripe-signature': 'test-signature', 'x-vercel-oidc-token': 'test-runtime' },
        body: item.body
      }));
      assert.equal(result.status, 202);
      assert.equal(upstreamCalls, 1);
      assert.deepEqual(await result.json(), { received: true });
      assert.equal(result.headers.get('cache-control'), 'no-store, max-age=0');
    }
    now += 60 * 60_000;
    globalThis.fetch = (async (input: any, init?: RequestInit) => {
      if (String(input).includes('sts.googleapis.com')) return Response.json({ access_token: 'test-access' });
      if (String(input).includes('iamcredentials.googleapis.com')) return Response.json({ token: 'test-id-token' });
      assert.equal(String(input), 'https://backend.example.invalid/api/tours/arenal/availability?date=2026-12-01');
      return Response.json({ available: false });
    }) as typeof fetch;
    const nested = await gateway.fetch(new Request('https://app.example.invalid/api/[...path]?__crt_path=tours%2Farenal%2Favailability&date=2026-12-01', {
      headers: { 'x-vercel-oidc-token': 'test-runtime' }
    }));
    assert.equal(nested.status, 200);
    for (const path of ['agent/counter', 'gemini/concierge', 'itinerary/book']) {
      const direct = await gateway.fetch(new Request('https://app.example.invalid/api/[...path]?__crt_path=' + encodeURIComponent(path)));
      assert.equal(direct.status, 400);
    }
    const nestedPrivate = await gateway.fetch(new Request('https://app.example.invalid/api/[...path]?__crt_path=admin%2Fcontrol-center'));
    assert.equal(nestedPrivate.status, 401);
    let externalCalls = 0;
    globalThis.fetch = (async () => { externalCalls++; throw new Error('must not call upstream'); }) as typeof fetch;
    const tooLarge = await gateway.fetch(new Request('https://app.example.invalid/api/bookings', {
      method: 'POST', body: 'x'.repeat(256 * 1024 + 1)
    }));
    assert.equal(tooLarge.status, 413);
    assert.equal(externalCalls, 0);
    const privateRoute = await gateway.fetch(new Request('https://app.example.invalid/api/admin/control-center'));
    assert.equal(privateRoute.status, 401);
    assert.equal(externalCalls, 0);
  } finally {
    globalThis.fetch = realFetch;
    Date.now = realNow;
    keys.forEach((key, index) => {
      if (original[index] === undefined) delete process.env[key];
      else process.env[key] = original[index];
    });
  }
});
