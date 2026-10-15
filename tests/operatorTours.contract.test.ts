import assert from 'node:assert/strict';
import test from 'node:test';
import { OPERATOR_TOUR_ROWS, OPERATOR_TOURS } from '../src/data/operatorTours';
import { TOURS } from '../src/data/toursCatalog';

const CATEGORIES = new Set(['volcanoes','wildlife','canopy','beaches','rafting','culture','multiday','combos','adventure','nature','hiking','waterfalls','rural','gastronomy','surf','snorkeling','diving','whale_watching','kayak','fishing','family','services']);
const REGIONS = new Set(['arenal','monteverde','manuel_antonio','guanacaste','tortuguero','pacuare','san_jose','sjo','caribe','caribe_sur','osa','marino_ballena','perez_zeledon','dominical','uvita','puerto_viejo','cahuita','jaco','cartago','turrialba','corcovado','golfo_dulce','central_pacific','sarapiqui','los_santos','golfito']);
const DIFFICULTY = new Set(['fácil','moderado','exigente','por_confirmar']);

test('operator tours are appended to the lazy catalog', () => {
  assert.ok(OPERATOR_TOURS.length >= 300, `only ${OPERATOR_TOURS.length}`);
  const ids = new Set(TOURS.map((t) => t.id));
  for (const tour of OPERATOR_TOURS) assert.ok(ids.has(tour.id), tour.id);
});

test('tour ids are unique across the whole catalog', () => {
  const ids = TOURS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every operator tour row is valid and sourced', () => {
  for (const r of OPERATOR_TOUR_ROWS) {
    assert.ok(CATEGORIES.has(r.category), `${r.id} category ${r.category}`);
    assert.ok(REGIONS.has(r.region), `${r.id} region ${r.region}`);
    assert.ok(DIFFICULTY.has(r.difficulty), `${r.id} difficulty ${r.difficulty}`);
    assert.ok(Number.isFinite(r.priceUSD) && r.priceUSD >= 0, `${r.id} price`);
    assert.ok(r.lat >= 5.4 && r.lat <= 11.3 && r.lng >= -87.2 && r.lng <= -82.5, `${r.id} outside Costa Rica`);
    assert.match(r.sourceUrl, /^https:\/\//, `${r.id} sourceUrl`);
    assert.ok(r.titleEs && r.titleEn && r.operatorName, `${r.id} text`);
    if (r.priceUSD === 0) assert.ok(r.priceNote, `${r.id} zero price needs priceNote`);
  }
});

test('operator tours never claim reviews, ratings or instant booking', () => {
  for (const t of OPERATOR_TOURS) {
    assert.equal(t.catalogStatus, 'inquiry');
    assert.equal(t.rating, 0);
    assert.equal(t.reviewsCount, 0);
    assert.equal(t.instantConfirmation, false);
    assert.equal(t.priceSource, 'publicado_por_operador');
  }
});
