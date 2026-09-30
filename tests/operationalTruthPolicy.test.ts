import test from 'node:test';
import assert from 'node:assert/strict';
import { canPromoteTruth, inferBusinessGoal, requiredOperationalFacts } from '../backend/operationalTruthPolicy';

test('customer intent can never become live verified inventory by inference', () => {
  assert.equal(canPromoteTruth({
    from: 'CUSTOMER_PROVIDED',
    to: 'LIVE_VERIFIED',
    evidence: { source: 'internal_inference', authoritative: false, observedAt: new Date().toISOString() }
  }), false);
});

test('fresh authoritative provider API evidence can establish live truth', () => {
  assert.equal(canPromoteTruth({
    from: 'PROVIDER_PROVIDED',
    to: 'LIVE_VERIFIED',
    evidence: {
      source: 'provider_api',
      authoritative: true,
      observedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString()
    }
  }), true);
});

test('expired evidence cannot establish live truth', () => {
  assert.equal(canPromoteTruth({
    from: 'PROVIDER_PROVIDED',
    to: 'LIVE_VERIFIED',
    evidence: {
      source: 'provider_portal',
      authoritative: true,
      observedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
      expiresAt: new Date(Date.now() - 1_000).toISOString()
    }
  }), false);
});

test('lodging quote requires the operational fields needed for a safe customer quote', () => {
  const required = requiredOperationalFacts('lodging_quote');
  for (const key of ['availability', 'finalPrice', 'roomConfiguration', 'childPolicy', 'cancellationPolicy']) {
    assert.ok(required.includes(key));
  }
});

test('business goal inference recognizes accommodation requests', () => {
  assert.equal(inferBusinessGoal('travel_request', 'Necesito hospedaje en Puerto Viejo'), 'lodging_quote');
});
