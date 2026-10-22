/**
 * #381 — SEO internacional: robots, sitemap con hreflang es/en, OG/Twitter absolutos y
 * JSON-LD (TravelAgency / WebSite / TouristTrip) sin datos inventados ni identidad del operador.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { TOURS } from '../src/data/toursCatalog';
import { ENABLED_LANGUAGES, LOCALES } from '../src/i18n/locales';
import { buildSitemapXml, SITE_ORIGIN, SITEMAP_LANGUAGES } from '../scripts/generateSitemap';
import { renderTourHtml } from '../scripts/tourPrerender';
// @ts-ignore módulo .mjs con JSDoc
import { buildMatchers, scanText } from '../scripts/lib/operatorPrivacyScan.mjs';

const indexHtml = fs.readFileSync('index.html', 'utf8');
const INVENTED = /"(?:priceRange|aggregateRating|review|reviews|offers|ratingValue|award|foundingDate|numberOfEmployees|sameAs)"/;
const jsonLd = (html: string) => [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(m => JSON.parse(m[1]));
const meta = (html: string, key: string) => html.match(new RegExp(`<meta\\s+(?:name|property)="${key}"\\s+content="([^"]*)"`, 'i'))?.[1];

test('robots.txt: permite el sitio, bloquea áreas internas y apunta al sitemap', () => {
  const robots = fs.readFileSync('public/robots.txt', 'utf8');
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  for (const path of ['/admin', '/api/', '/ops', '/workspace', '/provider', '/operator']) assert.match(robots, new RegExp(`^Disallow: ${path.replace('/', '\\/')}$`, 'm'), path);
  assert.match(robots, new RegExp(`^Sitemap: ${SITE_ORIGIN}/sitemap\\.xml$`, 'm'));
});

test('sitemap: cada URL declara hreflang es, en y x-default (= loc)', () => {
  const xml = fs.readFileSync('public/sitemap.xml', 'utf8');
  assert.equal(xml, buildSitemapXml(TOURS), 'run: npm run sitemap');
  assert.match(xml, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.deepEqual([...SITEMAP_LANGUAGES].sort(), [...ENABLED_LANGUAGES].sort(), 'hreflang = idiomas habilitados');
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => m[1]);
  assert.ok(urls.length > 500);
  for (const block of urls) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)![1];
    assert.ok(loc.startsWith(SITE_ORIGIN), loc);
    for (const lang of SITEMAP_LANGUAGES) assert.ok(block.includes(`hreflang="${lang}" href="${loc}?lang=${lang}"`), `${loc} ${lang}`);
    assert.ok(block.includes(`hreflang="x-default" href="${loc}"`), loc);
    // Orden del esquema sitemap 0.9: loc, lastmod, changefreq, priority y luego extensiones.
    assert.ok(block.indexOf('</priority>') < block.indexOf('<xhtml:link'), loc);
  }
});

test('index.html: OG/Twitter con URL absoluta y hreflang es/en/x-default', () => {
  for (const key of ['og:image', 'twitter:image']) assert.match(meta(indexHtml, key) || '', /^https:\/\/costaricatours2026\.vercel\.app\//, key);
  for (const key of ['og:title', 'og:description', 'og:site_name', 'og:locale', 'twitter:card', 'twitter:title', 'twitter:description']) assert.ok(meta(indexHtml, key), key);
  for (const lang of ['es', 'en', 'x-default']) assert.match(indexHtml, new RegExp(`hreflang="${lang}"`));
});

test('index.html: JSON-LD TravelAgency/WebSite sin datos inventados', () => {
  const blocks = jsonLd(indexHtml);
  assert.equal(blocks.length, 1);
  const raw = JSON.stringify(blocks[0]);
  assert.doesNotMatch(raw, INVENTED);
  const graph = blocks[0]['@graph'] as any[];
  const agency = graph.find(n => n['@type'] === 'TravelAgency');
  const site = graph.find(n => n['@type'] === 'WebSite');
  assert.equal(agency.name, 'Costa Rica Tours');
  assert.equal(agency.url, `${SITE_ORIGIN}/`);
  const enabledNames = new Set(ENABLED_LANGUAGES.map(code => LOCALES[code].name));
  for (const lang of agency.contactPoint.availableLanguage) assert.ok(enabledNames.has(lang), `idioma no habilitado: ${lang}`);
  assert.deepEqual(site.inLanguage, ['es', 'en']);
  assert.equal(site.publisher['@id'], agency['@id']);
});

test('fichas /tour/:id: OG/Twitter completos y TouristTrip mínimo, sin operador', () => {
  const matchers = buildMatchers();
  for (const tour of TOURS.slice(0, 60)) {
    const html = renderTourHtml(indexHtml, tour, TOURS);
    const canonical = `${SITE_ORIGIN}/tour/${encodeURIComponent(tour.id)}`;
    assert.equal(meta(html, 'og:url'), canonical);
    for (const key of ['og:image', 'twitter:image']) assert.match(meta(html, key) || '', /^https:\/\//, `${tour.id} ${key}`);
    for (const key of ['og:title', 'og:description', 'twitter:card', 'twitter:title', 'twitter:description']) assert.ok(meta(html, key), `${tour.id} ${key}`);
    assert.equal((html.match(/<meta\s+property="og:image"/g) || []).length, 1, 'un solo og:image');
    const blocks = jsonLd(html);
    assert.equal(blocks.length, 1);
    const trip = blocks[0];
    assert.equal(trip['@type'], 'TouristTrip');
    assert.equal(trip.url, canonical);
    assert.deepEqual(Object.keys(trip).sort(), ['@context', '@type', 'description', 'inLanguage', 'name', 'url']);
    assert.doesNotMatch(JSON.stringify(trip), INVENTED);
    assert.deepEqual(scanText(JSON.stringify(trip), matchers, { names: true, domains: true, fields: true }), [], tour.id);
  }
});
