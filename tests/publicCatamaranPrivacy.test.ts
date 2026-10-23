import test from 'node:test';
import assert from 'node:assert/strict';
import { TOURS } from '../src/data/toursCatalog';

test('public catamaran listing contains no private operator identity', () => {
  const tour = TOURS.find(t => t.id === 'puntarenas-sunset-dinner-cruise');
  assert.ok(tour, 'existing tour remains in catalog');
  assert.equal(tour.providerId, undefined);
  assert.equal(tour.title.es, 'Crucero al Atardecer y Cena Tropical en Catamarán');
  assert.equal(tour.title.en, 'Sunset Dinner Catamaran Cruise in the Gulf of Nicoya');
  assert.doesNotMatch(JSON.stringify(tour).toLowerCase(), /bay[- ]island[- ]cruises/);
});
