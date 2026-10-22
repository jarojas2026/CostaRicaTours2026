import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OPERATOR_TOUR_ROWS, OPERATOR_TOURS } from '../src/data/operatorTours';
import { tourAllowsPayment, tourReviewDate } from '../src/utils/tourResolver';
import { publishedTourPrice } from '../src/utils/tourPublication';
import { buildSitemapXml } from '../scripts/generateSitemap';

const sources = JSON.parse(readFileSync('data/internal/operatorTourSources.json', 'utf8')).tours;
const batch = OPERATOR_TOUR_ROWS.filter(row => row.reviewedAt === '2026-10-22');

test('new researched experiences retain individual dates and internal evidence', () => {
  assert.equal(batch.length, 30);
  assert.equal(new Set(batch.map(row => row.id)).size, 30);
  assert.ok(new Set(batch.map(row => row.category)).size >= 9);
  assert.ok(new Set(batch.map(row => row.region)).size >= 7);
  for (const row of batch) {
    const source = sources.find((item: { id: string }) => item.id === row.id);
    assert.ok(source?.sourceUrl.startsWith('https://'), row.id);
    assert.equal(source.priceCheckedAt, row.reviewedAt);
    assert.equal(source.ictVerified, false);
    const tour = OPERATOR_TOURS.find(item => item.id === row.id)!;
    assert.equal(tourReviewDate(tour), row.reviewedAt);
    assert.ok(row.descriptionEs && row.descriptionEn && row.descriptionEs !== row.descriptionEn);
  }
});

test('unconfirmed additions are searchable inquiries, never payment-ready inventory', () => {
  for (const row of batch) {
    const tour = OPERATOR_TOURS.find(item => item.id === row.id)!;
    assert.equal(tour.catalogStatus, 'inquiry');
    assert.equal(tourAllowsPayment(tour), false);
    assert.equal(tour.instantConfirmation, false);
    assert.equal(tour.rating, 0);
    assert.equal(tour.reviewsCount, 0);
    assert.equal(tour.priceUSD, 0);
    assert.equal(tour.priceNote, 'precio_por_confirmar');
    assert.equal(publishedTourPrice(tour), undefined);
  }
});

test('legacy review dates stay unchanged and new sitemap entries use individual dates', () => {
  const legacy = OPERATOR_TOUR_ROWS.filter(row => !row.reviewedAt);
  assert.ok(legacy.length >= 546);
  for (const row of legacy) {
    assert.equal(OPERATOR_TOURS.find(tour => tour.id === row.id)!.priceCheckedAt, '2026-10-14');
  }
  const xml = buildSitemapXml(OPERATOR_TOURS.filter(tour => batch.some(row => row.id === tour.id)));
  for (const row of batch) assert.ok(xml.includes('/tour/' + row.id), row.id);
  assert.ok(xml.includes('<lastmod>2026-10-22</lastmod>'));
});
