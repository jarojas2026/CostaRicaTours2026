import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { isBookableTour, normalizeCatalogSearch } from '../src/utils/tourListing';

test('a catalog reference is not bookable without explicit provider onboarding', () => {
  assert.equal(isBookableTour({ catalogStatus: undefined, providerId: undefined }), false);
  assert.equal(isBookableTour({ catalogStatus: 'inquiry', providerId: 'provider-1' }), false);
  assert.equal(isBookableTour({ catalogStatus: 'bookable', providerId: '   ' }), false);
});

test('a bookable tour requires both an explicit status and a provider ID', () => {
  assert.equal(isBookableTour({ catalogStatus: 'bookable', providerId: 'provider-1' }), true);
});

test('catalog search ignores accents and letter case', () => {
  assert.equal(normalizeCatalogSearch('  Sarapiquí '), 'sarapiqui');
});
