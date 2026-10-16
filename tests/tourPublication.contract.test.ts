import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOURS } from '../src/data/toursCatalog';
import { publishedTourPrice, similarTours } from '../src/utils/tourPublication';
import { renderTourHtml } from '../scripts/tourPrerender';

const tour = TOURS.find(t => t.priceSource === 'precio_referencia' && t.priceUSD > 0)!;
const template = '<html><head><title>Generic</title></head><body><div id="root"></div><script src="/assets/app.js"></script></body></html>';

test('prices need a reference-price source, positive amount and review date', () => {
  assert.equal(publishedTourPrice(tour), tour.priceUSD);
  for (const patch of [{ priceSource: undefined }, { priceCheckedAt: '' }, { priceCheckedAt: 'ayer' }, { priceUSD: 0 }, { priceUSD: NaN }]) {
    assert.equal(publishedTourPrice({ ...tour, ...patch }), undefined);
  }
});

test('all catalog pages have escaped bilingual content, canonical, neutral operator text and no invented Offer or ratings', () => {
  for (const item of TOURS) {
    const html = renderTourHtml(template, item, TOURS);
    assert.match(html, /lang="es"/);
    assert.match(html, /lang="en"/);
    assert.ok(html.includes(`/tour/${encodeURIComponent(item.id)}`));
    assert.match(html, /Consultar disponibilidad/);
    assert.match(html, /Operador local seleccionado por Costa Rica Tours/);
    assert.doesNotMatch(html, /Fuente del operador|Operator source|nofollow noopener/);
    assert.doesNotMatch(html, /"(?:Offer|AggregateRating|Review)"/);
    assert.match(html, /src="\/assets\/app.js"/);
  }
  const html = renderTourHtml(template, { ...tour, title: { ...tour.title, es: '</script><script>alert(1)</script>' } }, TOURS);
  assert.doesNotMatch(html, /<script>alert/);
});

test('unpublished prices never appear in prerender; similar tours come from catalog', () => {
  assert.doesNotMatch(renderTourHtml(template, { ...tour, priceCheckedAt: '', priceUSD: 12345678 }, TOURS), /12345678/);
  for (const related of similarTours(tour, TOURS)) {
    assert.notEqual(related.id, tour.id);
    assert.ok(TOURS.includes(related));
  }
});

test('detail navigation resets booking state and retains consent and provider payment gates', () => {
  const page = readFileSync('src/pages/TourDetailPage.tsx', 'utf8');
  assert.match(page, /TourDetailContent key=\{id\}/);
  assert.match(page, /if \(!consent\)/);
  assert.ok(page.indexOf('if (!consent)') < page.indexOf("fetch('/api/bookings'"));
  assert.match(page, /providerResult !== 'confirmed'/);
  assert.match(page, /Consultar disponibilidad/);
  assert.match(readFileSync('src/components/TourCard.tsx', 'utf8'), /<Link\s+to=\{`\/tour\//);
});
