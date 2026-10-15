import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_CATALOG_PRICE, catalogSearchHref,
  patchCatalogRouteFilters, readCatalogRouteFilters
} from '../src/utils/catalogRouteFilters';

test('footer links use real category identifiers and do not drop region filters', () => {
  const original = new URLSearchParams('favorites=1&category=wildlife&region=osa');
  const changed = patchCatalogRouteFilters(original, { category: 'canopy' });
  assert.equal(changed.get('favorites'), '1');
  assert.equal(changed.get('region'), 'osa');
  assert.equal(changed.get('category'), 'canopy');
  assert.equal(readCatalogRouteFilters(changed).category, 'canopy');
  assert.equal(catalogSearchHref({ category: 'canopy' }), '/tours?category=canopy');
  assert.equal(catalogSearchHref({ category: 'all' }), '/tours');
});

test('copying a deep link preserves all filters without appending defaults', () => {
  const url = new URLSearchParams('q=quetzal&category=wildlife&region=monteverde&difficulty=moderado&maxPrice=120&favorites=1');
  const state = readCatalogRouteFilters(url);
  assert.deepEqual(state, {
    q: 'quetzal', category: 'wildlife', region: 'monteverde', difficulty: 'moderado',
    maxPrice: 120, favorites: true
  });
  const next = patchCatalogRouteFilters(url, { region: 'osa' });
  assert.equal(next.get('q'), 'quetzal');
  assert.equal(next.get('category'), 'wildlife');
  assert.equal(next.get('difficulty'), 'moderado');
  assert.equal(next.get('maxPrice'), '120');
  assert.equal(next.get('favorites'), '1');
  assert.equal(next.get('region'), 'osa');
});

test('reset all filters clears one URL transaction and does not fabricate prices', () => {
  const old = new URLSearchParams('q=sloth&category=beaches&region=guanacaste&difficulty=fácil&maxPrice=80&favorites=1');
  const next = patchCatalogRouteFilters(old, {
    q: '', category: 'all', region: 'all', difficulty: 'all',
    maxPrice: DEFAULT_CATALOG_PRICE, favorites: false
  });
  assert.equal(next.toString(), '');
  assert.deepEqual(readCatalogRouteFilters(next), {
    q: '', category: 'all', region: 'all', difficulty: 'all',
    maxPrice: 500, favorites: false
  });
});

test('invalid and hostile deep link values cannot create phantom catalog filters', () => {
  const query = new URLSearchParams({
    category: 'adventure', region: 'not-a-region', difficulty: 'extremo',
    maxPrice: 'Infinity', favorites: 'yes', q: 'x'.repeat(1000)
  });
  const read = readCatalogRouteFilters(query);
  assert.equal(read.category, 'all');
  assert.equal(read.region, 'all');
  assert.equal(read.difficulty, 'all');
  assert.equal(read.maxPrice, 500);
  assert.equal(read.favorites, false);
  assert.equal(read.q.length, 250);
  assert.equal(readCatalogRouteFilters(new URLSearchParams('maxPrice=0')).maxPrice, 500);
  assert.equal(readCatalogRouteFilters(new URLSearchParams('maxPrice=-50')).maxPrice, 500);
});

test('editing a search term preserves other filters and removing it does not erase favorites', () => {
  const original = new URLSearchParams('category=rafting&region=pacuare&favorites=1&q=old');
  const next = patchCatalogRouteFilters(original, { q: 'waterfall' });
  assert.equal(next.get('q'), 'waterfall');
  const cleared = patchCatalogRouteFilters(next, { q: '' });
  assert.equal(cleared.get('q'), null);
  assert.equal(cleared.get('category'), 'rafting');
  assert.equal(cleared.get('region'), 'pacuare');
  assert.equal(cleared.get('favorites'), '1');
  assert.equal(original.get('q'), 'old', 'original params are immutable');
});

test('typing a multi-word query keeps the space between words', () => {
  const afterSpace = patchCatalogRouteFilters(new URLSearchParams(), { q: 'Caño ' });
  assert.equal(readCatalogRouteFilters(afterSpace).q, 'Caño ');
  const full = patchCatalogRouteFilters(afterSpace, { q: 'Caño Negro' });
  assert.equal(readCatalogRouteFilters(full).q, 'Caño Negro');
  assert.equal(patchCatalogRouteFilters(full, { q: '   ' }).has('q'), false);
});
