import type { Plugin } from 'vite';
import type { Tour } from '../src/types';
import { TOURS } from '../src/data/toursCatalog';
import { publishedTourPrice, similarTours } from '../src/utils/tourPublication';

const origin = 'https://costaricatours2026.vercel.app';
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Static catalog snapshot; no inventory, payment claims, ratings or Offer markup. */
export function renderTourHtml(template: string, tour: Tour, tours: readonly Tour[]) {
  const title = `${tour.title.es} | Costa Rica Tours`;
  const description = tour.description.es.slice(0, 160);
  const canonical = `${origin}/tour/${encodeURIComponent(tour.id)}`;
  const price = publishedTourPrice(tour);
  const source = /^https:\/\//i.test(tour.sourceUrl || '') ? tour.sourceUrl : undefined;
  const sections = (['es', 'en'] as const).map(lang => {
    const es = lang === 'es';
    return `<section lang="${lang}"><${es ? 'h1' : 'h2'}>${escape(tour.title[lang] || tour.title.es)}</${es ? 'h1' : 'h2'}>
      <p>${escape(tour.description[lang] || tour.description.es)}</p>
      <p>${es ? 'Operador' : 'Operator'}: ${escape(tour.operatorName || (es ? 'Por confirmar' : 'To be confirmed'))}</p>
      <p>${price === undefined ? (es ? 'Consultar precio' : 'Ask for price') : `${es ? 'Precio publicado desde' : 'Published price from'} US$${price}`}</p>
      ${source ? `<a href="${escape(source)}" rel="nofollow noopener">${es ? 'Fuente del operador' : 'Operator source'}</a>` : ''}
      ${tour.priceCheckedAt ? `<p>${es ? 'Revisado el' : 'Checked on'} ${escape(tour.priceCheckedAt)}</p>` : ''}
      <p>${es ? 'Disponibilidad y precio final sujetos a confirmación escrita del operador antes del pago.' : 'Availability and final price require written operator confirmation before payment.'}</p>
      <a href="/ai">${es ? 'Consultar disponibilidad' : 'Check availability'}</a></section>`;
  }).join('');
  const related = similarTours(tour, tours).map(t => `<li><a href="/tour/${encodeURIComponent(t.id)}">${escape(t.title.es)}</a></li>`).join('');
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@type': 'TouristTrip', name: tour.title.es, description, url: canonical, inLanguage: ['es', 'en'] }).replace(/</g, '\\u003c');
  return template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escape(title)}</title>`)
    .replace(/<meta\s+(?:name|property)="(?:description|og:title|og:description|og:url|twitter:title|twitter:description)"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '')
    .replace('</head>', `<meta name="description" content="${escape(description)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}"><link rel="canonical" href="${canonical}"><script id="tour-schema" type="application/ld+json">${schema}</script></head>`)
    .replace('<div id="root"></div>', `<div id="root"><main style="max-width:70rem;margin:3rem auto;padding:2rem"><a href="/tours">Tours</a>${sections}<h2>Tours similares / Similar tours</h2><ul>${related}</ul></main></div>`);
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
      },
    },
  };
}
