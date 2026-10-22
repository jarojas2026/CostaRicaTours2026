/**
 * #379 — /api/health/ai público devuelve solo { status }; el detalle completo
 * (proveedores, política de costos/PII, breakers) solo para owner/admin autenticado.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Request } from 'express';
import { aiHealthHandler, healthRouter } from '../backend/routes/misc';
import type { OperatorAccessResult } from '../backend/authMiddleware';

const FAKE = 'test-key-never-a-real-key';
const SENSITIVE = /providers|policy|breakers|billing|allowExternalPii|maxCostUsd|fallbackEnabled|scope|maxAgeSeconds/;

const stubAccess = async (req: Request): Promise<OperatorAccessResult> => {
  const auth = String(req.headers.authorization || '');
  if (auth === 'Bearer owner-token') return { ok: true, access: { role: 'owner' } };
  if (auth === 'Bearer admin-token') return { ok: true, access: { role: 'admin' } };
  if (auth === 'Bearer operator-token') return { ok: true, access: { role: 'operator' } };
  if (auth === 'Bearer boom') throw new Error('verifier down');
  return { ok: false, status: 401, error: 'invalid' };
};

async function withServer(app: express.Express, fn: (base: string) => Promise<void>) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { server.once('listening', () => resolve()); server.once('error', reject); });
  const { port } = server.address() as AddressInfo;
  try { await fn(`http://127.0.0.1:${port}`); } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('público y credenciales no-admin: solo { status }, sin caché', async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = FAKE;
  const app = express();
  app.get('/api/health/ai', aiHealthHandler(stubAccess));
  try {
    await withServer(app, async (base) => {
      for (const headers of [{}, { authorization: 'Bearer operator-token' }, { authorization: 'Bearer nope' }, { authorization: 'Bearer boom' }, { 'x-operator-key': 'whatever' }] as Record<string, string>[]) {
        const res = await fetch(`${base}/api/health/ai`, { headers });
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('cache-control'), 'no-store');
        const text = await res.text();
        assert.deepEqual(Object.keys(JSON.parse(text)), ['status'], JSON.stringify(headers));
        assert.doesNotMatch(text, SENSITIVE);
        assert.doesNotMatch(text, /test-key|@/);
      }
    });
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous;
  }
});

test('owner/admin autenticado: detalle completo', async () => {
  const app = express();
  app.get('/api/health/ai', aiHealthHandler(stubAccess));
  await withServer(app, async (base) => {
    for (const token of ['owner-token', 'admin-token']) {
      const res = await fetch(`${base}/api/health/ai`, { headers: { authorization: `Bearer ${token}` } });
      assert.equal(res.headers.get('cache-control'), 'no-store');
      const body = await res.json();
      assert.equal(typeof body.status, 'string');
      assert.ok(Array.isArray(body.providers));
      assert.ok(Array.isArray(body.breakers));
      assert.equal(typeof body.policy.allowExternalPii, 'boolean');
    }
  });
});

test('router real: /api/health/ai sin credenciales devuelve solo { status }', async () => {
  const app = express();
  app.use(healthRouter);
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/health/ai`);
    const text = await res.text();
    assert.deepEqual(Object.keys(JSON.parse(text)), ['status']);
    assert.doesNotMatch(text, SENSITIVE);
  });
});
