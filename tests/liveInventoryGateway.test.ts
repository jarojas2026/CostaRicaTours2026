import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLiveInventoryObservation } from '../backend/liveInventoryGateway';

test('rejects non-authoritative inventory observations', () => {
  const result = validateLiveInventoryObservation('lodging_quote', {
    source: 'example',
    sourceType: 'inventory_api',
    authoritative: false,
    observedAt: new Date().toISOString(),
    facts: { availability: true, finalPrice: 500 }
  });
  assert.equal(result.status, 'unverified');
});

test('rejects stale inventory observations', () => {
  const result = validateLiveInventoryObservation('lodging_quote', {
    source: 'example',
    sourceType: 'inventory_api',
    authoritative: true,
    observedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    facts: { availability: true, finalPrice: 500 }
  });
  assert.equal(result.status, 'unverified');
});

test('accepts fresh authoritative lodging observation with required facts', () => {
  const result = validateLiveInventoryObservation('lodging_quote', {
    source: 'hotel-inventory-gateway',
    sourceType: 'inventory_api',
    authoritative: true,
    observedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    facts: {
      availability: true,
      finalPrice: 580,
      taxesAndFees: 0,
      roomConfiguration: 'family room',
      childPolicy: 'included',
      requiredAmenities: { breakfast: true, parking: true },
      cancellationPolicy: 'provider policy',
      paymentTerms: 'provider terms'
    }
  });
  assert.equal(result.status, 'verified_observation');
});


test('rejects an inventory observation without a traceable source', () => {
  const result = validateLiveInventoryObservation('tour_quote', {
    source: '   ',
    sourceType: 'provider_api',
    authoritative: true,
    observedAt: new Date().toISOString(),
    facts: { availability: true, finalPrice: 100 }
  });
  assert.equal(result.status, 'unverified');
});

test('rejects availability values that are not explicit booleans', () => {
  const result = validateLiveInventoryObservation('tour_quote', {
    source: 'provider-api',
    sourceType: 'provider_api',
    authoritative: true,
    observedAt: new Date().toISOString(),
    facts: { availability: 'yes', finalPrice: 100 }
  });
  assert.equal(result.status, 'unverified');
});

test('rejects string, negative, and non-finite final prices', () => {
  for (const finalPrice of ['100', -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = validateLiveInventoryObservation('tour_quote', {
      source: 'provider-api',
      sourceType: 'provider_api',
      authoritative: true,
      observedAt: new Date().toISOString(),
      facts: { availability: true, finalPrice }
    });
    assert.equal(result.status, 'unverified');
  }
});

test('rejects expiry timestamps that are earlier than the observation', () => {
  const observedAt = new Date().toISOString();
  const result = validateLiveInventoryObservation('tour_quote', {
    source: 'provider-api',
    sourceType: 'provider_api',
    authoritative: true,
    observedAt,
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
    facts: { availability: true, finalPrice: 100 }
  });
  assert.equal(result.status, 'unverified');
});

test('accepts an explicit unavailable result as verified information, not as a booking slot', () => {
  const result = validateLiveInventoryObservation('tour_quote', {
    source: 'provider-api',
    sourceType: 'provider_api',
    authoritative: true,
    observedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    facts: { availability: false, finalPrice: 100 }
  });
  assert.equal(result.status, 'verified_observation');
  if (result.status === 'verified_observation') {
    assert.equal(result.observation.facts.availability, false);
  }
});
