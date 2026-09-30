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
