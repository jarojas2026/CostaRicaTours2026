/**
 * Genera public/sitemap.xml: rutas públicas + /tour/:id de todo el catálogo
 * (tours curados y de operador). robots.txt ya apunta a /sitemap.xml.
 *
 *   npx tsx scripts/generateSitemap.ts          # escribe public/sitemap.xml
 *   npx tsx scripts/generateSitemap.ts --check  # falla si está desactualizado
 *
 * tests/sitemap.contract.test.ts verifica que el archivo commiteado coincide.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Tour } from '../src/types';
import { TOURS } from '../src/data/toursCatalog';
import { BLOG_POSTS } from '../src/data/blogPosts';
import { LEGAL_PAGES, LEGAL_PAGE_ORDER } from '../src/data/legalPages';

export const SITE_ORIGIN = 'https://costaricatours2026.vercel.app';
/** Fecha fija para rutas estáticas: el sitemap debe ser determinista. */
const STATIC_LASTMOD = '2026-10-16';

const STATIC_ROUTES: Array<[string, string, string]> = [
  ['/', 'daily', '1.0'],
  ['/tours', 'daily', '0.95'],
  ['/destinations', 'weekly', '0.85'],
  ['/activities', 'weekly', '0.85'],
  ['/map', 'weekly', '0.75'],
  ['/trip', 'weekly', '0.8'],
  ['/ai', 'weekly', '0.8'],
  ['/blog', 'weekly', '0.7'],
  ['/about', 'monthly', '0.6'],
];

const xmlEscape = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
/**
 * hreflang (#381): la SPA sirve cada idioma en la misma ruta con `?lang=` (src/i18n/detect.ts,
 * RouteMetadata.tsx). Cada <url> declara sus alternativas es/en y x-default (ruta sin parámetro),
 * igual que el <head> de index.html y de las fichas /tour/:id prerenderizadas.
 */
export const SITEMAP_LANGUAGES = ['es', 'en'] as const;
const alternates = (loc: string) => {
  const href = xmlEscape(SITE_ORIGIN + loc);
  return [
    ...SITEMAP_LANGUAGES.map(lang => `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}?lang=${lang}"/>`),
    `<xhtml:link rel="alternate" hreflang="x-default" href="${href}"/>`,
  ].join('');
};
const url = (loc: string, lastmod: string, changefreq: string, priority: string) =>
  `  <url><loc>${xmlEscape(SITE_ORIGIN + loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority>${alternates(loc)}</url>`;

export function tourSitemapPaths(tours: readonly Tour[]): string[] {
  const seen = new Set<string>();
  const paths: string[] = [];
  for (const tour of tours) {
    if (!/^[a-zA-Z0-9_-]+$/.test(tour.id) || seen.has(tour.id)) continue;
    seen.add(tour.id);
    paths.push(`/tour/${tour.id}`);
  }
  return paths;
}

export function buildSitemapXml(tours: readonly Tour[] = TOURS): string {
  const lines = STATIC_ROUTES.map(([loc, freq, prio]) => url(loc, STATIC_LASTMOD, freq, prio));
  for (const post of BLOG_POSTS) lines.push(url(`/blog/${post.slug}`, STATIC_LASTMOD, 'monthly', '0.6'));
  for (const id of LEGAL_PAGE_ORDER) lines.push(url(LEGAL_PAGES[id].path, STATIC_LASTMOD, 'yearly', '0.3'));
  const byId = new Map(tours.map(t => [t.id, t]));
  for (const p of tourSitemapPaths(tours)) {
    const tour = byId.get(p.slice('/tour/'.length))!;
    const lastmod = /^\d{4}-\d{2}-\d{2}$/.test(tour.priceCheckedAt || '') ? tour.priceCheckedAt! : STATIC_LASTMOD;
    lines.push(url(p, lastmod, 'weekly', tour.catalogStatus === 'inquiry' ? '0.6' : '0.7'));
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${lines.join('\n')}\n</urlset>\n`;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const target = path.join(process.cwd(), 'public', 'sitemap.xml');
  const xml = buildSitemapXml();
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(target, 'utf8') !== xml) {
      console.error('public/sitemap.xml está desactualizado: ejecuta npx tsx scripts/generateSitemap.ts');
      process.exit(1);
    }
    console.log('sitemap.xml al día');
  } else {
    fs.writeFileSync(target, xml);
    console.log(`sitemap.xml: ${xml.split('<url>').length - 1} URLs`);
  }
}
