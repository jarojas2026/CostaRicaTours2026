import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/App.tsx', 'utf8');
const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
const routes: string[] = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(match => match[1]);
const rewrites: Array<{ source: string; destination: string }> = config.rewrites || [];

const hasDirectEntry = (path: string): boolean =>
  path === '/' ||
  rewrites.some(rule =>
    rule.destination === '/index.html' &&
    (rule.source === path ||
      // Vercel route wildcard covers all admin subroutes.
      (rule.source === '/admin/:path*' && path.startsWith('/admin/')))
  );

test('every React Router URL has a direct-entry SPA rewrite on Vercel', () => {
  assert.ok(routes.length >= 20, 'Should cover all modern site routes');
  const missing = routes.filter(path => path !== '*' && !hasDirectEntry(path));
  assert.deepEqual(missing, [], 'Missing SPA rewrites for: ' + missing.join(', '));
});

test('digital city and participation survive direct load or refresh', () => {
  for (const url of ['/ciudad', '/participar']) {
    const rule = rewrites.find(rule => rule.source === url);
    assert.equal(rule?.destination, '/index.html', 'Missing rewrite for ' + url);
  }
});

test('SPA routing does not interfere with reserved API gateway URLs', () => {
  const api = rewrites.find(rule => rule.source.startsWith('/api/'));
  assert.ok(api, 'API gateway rewrite remains configured');
  assert.ok(api.destination.startsWith('/api/'));
  assert.ok(rewrites.find(rule => rule.source === '/tour/:id' && rule.destination === '/index.html'));
});
