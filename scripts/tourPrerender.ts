import type { Plugin } from 'vite';
import type { Tour } from '../src/types';
import { TOURS } from '../src/data/toursCatalog';
import { publishedTourPrice, similarTours } from '../src/utils/tourPublication';
import { neutralOperatorLabel, OPERATOR_IDENTITY_NOTE, SUPPLIER_POLICY } from '../src/utils/operatorPrivacy';

const origin = 'https://costaricatours2026.vercel.app';
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Static catalog snapshot; no inventory, payment claims, ratings, Offer markup or operator identity. */
export function renderTourHtml(template: string, tour: Tour, tours: readonly Tour[]) {
  const title = `${tour.title.es} | Costa Rica Tours`;
  const description = tour.description.es.slice(0, 160);
  const canonical = `${origin}/tour/${encodeURIComponent(tour.id)}`;
  const price = publishedTourPrice(tour);
  const sections = (['es', 'en'] as const).map(lang => {
    const es = lang === 'es';
    return `<section lang="${lang}"><${es ? 'h1' : 'h2'}>${escape(tour.title[lang] || tour.title.es)}</${es ? 'h1' : 'h2'}>
      <p>${escape(tour.description[lang] || tour.description.es)}</p>
      <p>${es ? 'Operador' : 'Operator'}: ${escape(neutralOperatorLabel(tour)[lang])}</p>
      <p>${price === undefined ? (es ? 'Consultar precio' : 'Ask for price') : `${es ? 'Precio de referencia desde' : 'Reference price from'} US$${price} (${es ? 'sujeto a confirmación' : 'subject to confirmation'})`}</p>
      ${tour.priceCheckedAt ? `<p>${es ? 'Revisado por nuestro equipo el' : 'Reviewed by our team on'} ${escape(tour.priceCheckedAt)}</p>` : ''}
      <p>${escape(SUPPLIER_POLICY[lang])} ${escape(OPERATOR_IDENTITY_NOTE[lang])}</p>
      <p>${es ? 'Disponibilidad y precio final se confirman por escrito antes del pago.' : 'Availability and final price are confirmed in writing before payment.'}</p>
      <a href="/ai">${es ? 'Consultar disponibilidad' : 'Check availability'}</a></section>`;
  }).join('');
  const related = similarTours(tour, tours).map(t => `<li><a href="/tour/${encodeURIComponent(t.id)}">${escape(t.title.es)}</a></li>`).join('');
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@type': 'TouristTrip', name: tour.title.es, description, url: canonical, inLanguage: ['es', 'en'] }).replace(/</g, '\\u003c');
  return template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escape(title)}</title>`)
    .replace(/<meta\s+(?:name|property)="(?:description|og:title|og:description|og:url|twitter:title|twitter:description)"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<link\s+rel="alternate"\s+hreflang="[^"]*"[^>]*>\s*/gi, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '')
    .replace('</head>', `<meta name="description" content="${escape(description)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="es" href="${canonical}?lang=es"><link rel="alternate" hreflang="en" href="${canonical}?lang=en"><link rel="alternate" hreflang="x-default" href="${canonical}"><script id="tour-schema" type="application/ld+json">${schema}</script></head>`)
    .replace('<div id="root"></div>', `<div id="root"><main style="max-width:70rem;margin:3rem auto;padding:2rem"><a href="/tours">Tours</a>${sections}<h2>Tours similares / Similar tours</h2><ul>${related}</ul></main></div>`);
}

/**
 * Static 404 shell served by Vercel (dist/404.html) with HTTP 404 for unknown routes and
 * unknown /tour/:id. noindex; no canonical; the SPA boots on top and renders NotFoundPage.
 */
export function renderNotFoundHtml(template: string, tours: readonly Tour[]) {
  const popular = [...tours]
    .sort((a, b) => ((b.featured ? 1e9 : 0) + (b.rating || 0) * (b.reviewsCount || 0)) - ((a.featured ? 1e9 : 0) + (a.rating || 0) * (a.reviewsCount || 0)))
    .slice(0, 4)
    .map(t => `<li><a href="/tour/${encodeURIComponent(t.slug || t.id)}">${escape(t.title.es)}</a></li>`).join('');
  const body = `<main style="max-width:44rem;margin:3rem auto;padding:2rem;font-family:system-ui,sans-serif;color:#e7e5e4">
    <p style="font-size:3rem;font-weight:900;color:#34d399">404</p>
    <section lang="es"><h1>Esta página no existe</h1><p>La dirección puede estar mal escrita o la página ya no está disponible.</p></section>
    <section lang="en"><h2>This page does not exist</h2><p>The address may be mistyped or the page is no longer available.</p></section>
    <form role="search" action="/tours" method="get"><label for="nf-q">Buscar tours / Search tours</label> <input id="nf-q" type="search" name="q" maxlength="250"> <button type="submit">Buscar / Search</button></form>
    <nav><a href="/tours">Tours</a> · <a href="/destinations">Destinos / Destinations</a> · <a href="/ai">Asistente / Assistant</a> · <a href="/">Inicio / Home</a></nav>
    <h2>Tours populares / Popular tours</h2><ul>${popular}</ul></main>`;
  return template
    .replace(/<title>[\s\S]*?<\/title>/i, '<title>Página no encontrada (404) | Costa Rica Tours</title>')
    .replace(/<meta\s+name="robots"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:url"[^>]*>/gi, '')
    .replace(/<link\s+rel="alternate"\s+hreflang="[^"]*"[^>]*>\s*/gi, '')
    .replace('</head>', '<meta name="robots" content="noindex,follow"></head>')
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

export function tourPrerender(): Plugin {
  return {
    name: 'tour-catalog-prerender',
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const index = bundle['index.html'];
        if (!index || index.type !== 'asset') throw new Error('Missing Vite index.html');
        const paths = new Set<string>();
        for (const tour of TOURS) {
          for (const id of new Set([tour.id, tour.slug].filter(Boolean) as string[])) {
            if (!/^[a-zA-Z0-9_-]+$/.test(id) || paths.has(id)) throw new Error(`Invalid or duplicate tour path: ${id}`);
            paths.add(id);
            this.emitFile({ type: 'asset', fileName: `tour/${id}/index.html`, source: renderTourHtml(String(index.source), tour, TOURS) });
          }
        }
        this.emitFile({ type: 'asset', fileName: '404.html', source: renderNotFoundHtml(String(index.source), TOURS) });
      },
    },
  };
}
