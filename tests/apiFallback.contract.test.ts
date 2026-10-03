import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('unregistered API paths return a bilingual JSON 404 before the SPA fallback', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  const apiFallback = source.indexOf("app.use('/api', (req, res) => {");
  const serverStart = source.indexOf('async function startServer()');
  const spaFallback = source.indexOf("app.get('*', (req, res) => {");

  assert.notEqual(apiFallback, -1, 'Missing the API not-found middleware');
  assert.notEqual(serverStart, -1, 'Missing the server startup boundary');
  assert.ok(apiFallback < serverStart, 'API not-found middleware must register before server startup');
  assert.ok(spaFallback > apiFallback, 'API errors must be handled before the SPA catch-all');

  const apiFallbackSource = source.slice(apiFallback, serverStart);
  assert.match(apiFallbackSource, /res\.status\(404\)\.json\(/);
  assert.match(apiFallbackSource, /api_route_not_found/);
  assert.match(apiFallbackSource, /Ruta de API no encontrada\..*API route not found\./);
});
