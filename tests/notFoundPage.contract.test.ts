import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { renderNotFoundHtml } from '../scripts/tourPrerender';
import { TOURS } from '../src/data/toursCatalog';

const template = fs.readFileSync('index.html', 'utf8');
const html = renderNotFoundHtml(template, TOURS);

test('static 404 shell is noindex, has no canonical and keeps the SPA root', () => {
  assert.match(html, /<meta name="robots" content="noindex,follow">/);
  assert.doesNotMatch(html, /index,follow,max-image-preview/);
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.match(html, /<title>Página no encontrada \(404\)/);
  assert.match(html, /<div id="root">/);
});

test('static 404 shell offers search, Tours/Destinos/Asistente and popular tours (ES/EN)', () => {
  assert.match(html, /<form role="search" action="\/tours" method="get">/);
  for (const href of ['/tours', '/destinations', '/ai']) assert.ok(html.includes(`href="${href}"`), href);
  assert.match(html, /Esta página no existe/);
  assert.match(html, /This page does not exist/);
  assert.equal((html.match(/href="\/tour\//g) || []).length, 4);
});

test('Vercel keeps real 404s: no catch-all SPA rewrite and the build emits 404.html', () => {
  const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  for (const r of vercel.rewrites) assert.notEqual(r.source, '/(.*)', 'catch-all rewrite would turn 404 into 200');
  assert.match(fs.readFileSync('scripts/tourPrerender.ts', 'utf8'), /fileName: '404\.html'/);
});

test('SPA 404 view sets noindex and is used for unknown routes and unknown tours', () => {
  const page = fs.readFileSync('src/pages/NotFoundPage.tsx', 'utf8');
  assert.match(page, /NOT_FOUND_ROBOTS = 'noindex,follow'/);
  assert.match(fs.readFileSync('src/App.tsx', 'utf8'), /<Route path="\*" element={<Suspense fallback={<RouteFallback \/>}><NotFoundPage language/);
  assert.match(fs.readFileSync('src/pages/TourDetailPage.tsx', 'utf8'), /<NotFoundPage language={language} variant="tour" \/>/);
});
