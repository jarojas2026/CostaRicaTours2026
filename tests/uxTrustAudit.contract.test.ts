import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/i18n';
import { resolveRouteMeta } from '../src/components/RouteMetadata';
import { LEGAL_PAGES, LEGAL_PAGE_ORDER } from '../src/data/legalPages';
import { BLOG_POSTS } from '../src/data/blogPosts';
import { referencePriceParts } from '../src/utils/referencePrice';

const read = (file: string) => readFileSync(file, 'utf8');

test('public surfaces do not claim unsupported verification, live inventory or model branding', () => {
  const files = [
    'src/components/FeaturedToursSection.tsx',
    'src/components/HomeQuickNav.tsx',
    'src/components/Header.tsx',
    'src/components/DigitalCounterWidget.tsx',
    'src/components/DestinationsSection.tsx',
    'src/components/AIAssistant.tsx',
  ].map(read).join('\n');
  for (const claim of [
    '100% Verified', '100% Verificadas', 'Disponibilidad verificada', 'empresas locales certificadas',
    'certified local companies', 'tiempo real y asistencia 24/7', 'Live Rates & Availability',
    '24/7 Digital Booking Counter', 'Operadores Certificados', "'Trending'", '<span>{msg.modelUsed}</span>',
  ]) {
    assert.equal(files.includes(claim), false, `Unsupported claim remains: ${claim}`);
  }
});

test('language selector only offers translated languages', () => {
  assert.deepEqual(SUPPORTED_LANGUAGES.map(l => l.code), ['es', 'en']);
});

test('legal pages exist as routes with draft notice content in both languages', () => {
  const app = read('src/App.tsx');
  for (const id of LEGAL_PAGE_ORDER) {
    const page = LEGAL_PAGES[id];
    assert.match(app, new RegExp(`<Route path="${page.path}"`));
    assert.ok(page.sections.length > 0 && page.title.es && page.title.en);
  }
  assert.match(read('src/data/legalPages.ts'), /Versión preliminar, en revisión legal/);
  assert.match(read('src/data/legalPages.ts'), /Última actualización: 14 de octubre de 2026/);
  assert.match(read('src/data/legalPages.ts'), /Ley N\.º 8968/);
  const footer = read('src/components/Footer.tsx');
  for (const path of ['/terms', '/cancellation', '/privacy', '/sinac-escnna']) assert.match(footer, new RegExp(`to="${path}"`));
});

test('blog posts have real bodies and their own URLs', () => {
  assert.match(read('src/App.tsx'), /<Route path="\/blog\/:slug"/);
  for (const post of BLOG_POSTS) {
    assert.ok(post.sections.length >= 3, post.slug);
    assert.ok(post.sources.length >= 1, post.slug);
  }
  assert.doesNotMatch(read('src/components/BlogSection.tsx'), /Editorial preview|Contenido editorial de muestra/);
});

test('each main route gets its own title and description per language', () => {
  const routes = ['/', '/tours', '/map', '/ai', '/blog', '/destinations', '/terms', '/cancellation', '/privacy', '/sinac-escnna', `/blog/${BLOG_POSTS[0].slug}`];
  for (const lang of ['es', 'en'] as const) {
    const titles = routes.map(route => resolveRouteMeta(route, lang).title);
    assert.equal(new Set(titles).size, titles.length, `duplicate titles in ${lang}: ${titles.join(' / ')}`);
  }
  assert.notEqual(resolveRouteMeta('/tours', 'es').description, resolveRouteMeta('/tours', 'en').description);
});

test('reference prices are labelled and conversions are approximate', () => {
  const crc = referencePriceParts(85, 'CRC', 510, 'es');
  assert.equal(crc.usd, 'US$85');
  assert.match(crc.headline, /Precio de referencia desde US\$85/);
  assert.match(crc.approx || '', /aprox\./);
  assert.match(crc.disclaimer, /Sujeto a confirmación/);
  const noRate = referencePriceParts(85, 'CRC', 0, 'en');
  assert.equal(noRate.approx, undefined, 'never fake a conversion with rate 1');
});
