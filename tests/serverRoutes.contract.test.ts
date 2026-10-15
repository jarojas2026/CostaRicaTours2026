import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
// routeInventory must load before backend/app: it records Express 5 mount paths.
import { formatRouteEntry, listRegisteredRoutes } from './helpers/routeInventory';
import { createApp } from '../backend/app';

const snapshotPath = path.join(process.cwd(), 'tests', 'fixtures', 'serverRoutes.snapshot.txt');

// The snapshot was generated from the monolithic server.ts before it was split
// into backend/routes/*. Regenerate deliberately with UPDATE_ROUTE_SNAPSHOT=1
// when a route is intentionally added, removed or moved.
test('Express layers match the pre-split server snapshot (no route lost or reordered)', () => {
  const current = listRegisteredRoutes(createApp()).map(formatRouteEntry);
  if (process.env.UPDATE_ROUTE_SNAPSHOT === '1') {
    fs.writeFileSync(snapshotPath, `${current.join('\n')}\n`);
  }
  const expected = fs.readFileSync(snapshotPath, 'utf8').trimEnd().split('\n');
  assert.deepEqual(current, expected);
});

test('no METHOD + path is registered twice', () => {
  const seen = new Set<string>();
  for (const entry of listRegisteredRoutes(createApp())) {
    if (entry.kind !== 'ROUTE') continue;
    for (const method of entry.methods) {
      const key = `${method} ${entry.path}`;
      assert.equal(seen.has(key), false, `${key} registered twice`);
      seen.add(key);
    }
  }
});

test('global middleware, API 404 and error handler wrap the domain routers', () => {
  const layers = listRegisteredRoutes(createApp()).map(formatRouteEntry);
  const firstRoute = layers.findIndex((line) => line.startsWith('ROUTE '));
  const lastRoute = layers.findLastIndex((line) => line.startsWith('ROUTE '));
  assert.ok(layers.slice(0, firstRoute).some((line) => line.includes('commerce')), 'admin routers before domain routes');
  assert.match(layers[lastRoute + 1], /^USE \/api /, 'API 404 right after the last route');
  assert.equal(layers.at(-1), 'USE / apiErrorHandler');
});
