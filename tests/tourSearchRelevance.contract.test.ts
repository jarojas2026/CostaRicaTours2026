import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogTourSearchScore, catalogSearchTerms, isGenericCatalogSearch } from '../src/utils/tourListing';
import type { Tour } from '../src/types';

const poas = {
  id: 'poas', title: { es: 'Volcán Poás', en: 'Poás Volcano' }, subtitle: { es: 'Cráter activo', en: 'Active crater' },
  category: 'volcanoes', region: 'sjo', location: { placeName: 'Poás, Alajuela' },
  highlights: { es: ['Cráter del Poás'], en: ['Poás crater'] }, inclusions: { es: ['Transporte'], en: ['Transport'] },
  description: { es: 'Un recorrido de naturaleza', en: 'A nature excursion' }
} as unknown as Tour;
const arenal = {
  id: 'arenal', title: { es: 'Aguas termales de Arenal', en: 'Arenal hot springs' }, subtitle: { es: 'Visita al volcán Poás', en: 'Visit to Poás volcano' },
  category: 'nature', region: 'arenal', location: { placeName: 'La Fortuna' },
  highlights: { es: ['Termales'], en: ['Hot springs'] }, inclusions: { es: ['Entrada'], en: ['Entrance'] },
  description: { es: 'Incluye una parada en Poás', en: 'Includes a stop at Poás' }
} as unknown as Tour;

test('title matches rank above descriptive mentions', () => {
  assert.ok(catalogTourSearchScore(poas, 'Poás') > catalogTourSearchScore(arenal, 'Poás'));
});

test('category, region and highlights match ahead of description', () => {
  const metadataTour = { ...arenal, highlights: { es: ['café'], en: ['coffee'] } } as Tour;
  const descriptionTour = { ...arenal, highlights: { es: ['relax'], en: ['relax'] }, description: { es: 'café', en: 'coffee' } } as Tour;
  assert.ok(catalogTourSearchScore(metadataTour, 'coffee') > catalogTourSearchScore(descriptionTour, 'coffee'));
});

test('generic searches do not filter the catalog', () => {
  assert.equal(isGenericCatalogSearch('tours Costa Rica'), true);
  assert.equal(catalogSearchTerms('experiencias en Costa Rica').length, 0);
  assert.equal(catalogTourSearchScore(poas, 'tours Costa Rica'), 0);
});

test('unknown specific query produces no match', () => {
  assert.equal(catalogTourSearchScore(poas, 'unicornio espacial'), 0);
});

test('localized category and region names participate in metadata-tier search', () => {
  assert.equal(catalogTourSearchScore(poas, 'volcanes'), 60);
});

test('generic catalog query ignores punctuation such as a trailing question mark', () => {
  assert.equal(isGenericCatalogSearch('tours Costa Rica?'), true);
  assert.equal(catalogSearchTerms('tours Costa Rica?').length, 0);
});
