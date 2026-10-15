import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import { apiErrorHandler, installAsyncRouteSafety } from '../backend/asyncRoutes';
import { createApp } from '../backend/app';

async function withServer(app: express.Express, run: (base: string) => Promise<void>) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('Express 5: async rejections reach the error handler exactly once', async () => {
  const app = express();
  installAsyncRouteSafety(app);
  let errorCalls = 0;
  app.get('/boom', async () => { throw new Error('boom'); });
  app.get('/sync-boom', () => { throw new Error('sync'); });
  app.use((err: any, req: any, res: any, next: any) => { errorCalls += 1; return apiErrorHandler(err, req, res, next); });
  await withServer(app, async (base) => {
    for (const path of ['/boom', '/sync-boom']) {
      const res = await fetch(base + path);
      assert.equal(res.status, 500);
      assert.equal((await res.json()).error, 'internal_error');
    }
  });
  assert.equal(errorCalls, 2);
});

test('Express 5: createApp keeps Express 4 contracts (req.body {}, qs query, API 404)', async () => {
  const app = createApp();
  // Probe routes outside /api run through createApp's global middleware.
  app.post('/__probe/echo', (req, res) => { res.json({ body: req.body, query: req.query }); });
  app.get('/{*splat}', (_req, res) => { res.send('spa'); });
  await withServer(app, async (base) => {
    const missing = await fetch(`${base}/api/does-not-exist`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error, 'api_route_not_found');

    const echoed = await (await fetch(`${base}/__probe/echo?filters[region]=caribe`, { method: 'POST' })).json();
    assert.deepEqual(echoed.body, {}, 'req.body defaults to {} without a JSON body');
    assert.deepEqual(echoed.query, { filters: { region: 'caribe' } }, 'nested qs query parsing preserved');

    assert.equal(await (await fetch(`${base}/`)).text(), 'spa', "'/{*splat}' matches the root");
    assert.equal(await (await fetch(`${base}/tours/arenal`)).text(), 'spa');
  });
});
