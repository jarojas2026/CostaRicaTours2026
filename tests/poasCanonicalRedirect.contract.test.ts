import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const catalog = readFileSync('src/data/toursCatalog.ts', 'utf8');
const resolver = readFileSync('src/utils/tourResolver.ts', 'utf8');
const metadata = readFileSync('src/components/RouteMetadata.tsx', 'utf8');

test('legacy Poás Doka slug permanently redirects 301 to canonical Poás tour ID', () => {
  const redirect = vercel.redirects.find((item: any) => item.source === '/tour/poas-volcano-doka-waterfall');
  assert.deepEqual(redirect, {
    source: '/tour/poas-volcano-doka-waterfall',
    destination: '/tour/poas-volcano-coffee-waterfall',
    statusCode: 301,
  });
});

test('canonical Poás ID exists and resolver supports ID/slug without creating duplicate tour', () => {
  assert.match(catalog, /id: 'poas-volcano-coffee-waterfall'/);
  assert.match(resolver, /tours\.find\(t => t\.id === id\) \|\| tours\.find\(t => t\.slug === id\)/);
  assert.match(metadata, /tour\.id\) : pathname/);
});
