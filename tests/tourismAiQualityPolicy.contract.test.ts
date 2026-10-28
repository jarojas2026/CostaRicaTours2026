import test from 'node:test';
import assert from 'node:assert/strict';
import { assessTourismEvidence, canClaimVerifiedTourismFact, TOURISM_AI_GUARDRAILS } from '../backend/tourismAiQualityPolicy';

test('dynamic tourism claims fail closed when source or timestamp is missing', () => {
  for (const kind of ['price', 'availability', 'booking', 'payment', 'weather', 'road', 'opening-hours', 'safety'] as const) {
    const result = assessTourismEvidence({ kind, verified: true, source: 'source', now: 10_000 });
    assert.equal(result.status, 'unknown', kind);
    assert.equal(result.requiresLiveVerification, true, kind);
  }
});

test('fresh, sourced evidence can be verified without network access', () => {
  const result = assessTourismEvidence({
    kind: 'availability', source: 'canonical-booking-service', verified: true,
    observedAt: 9_500, now: 10_000,
  });
  assert.deepEqual(result, { status: 'verified', requiresLiveVerification: false, reason: 'source_verified' });
  assert.equal(canClaimVerifiedTourismFact({
    kind: 'availability', source: 'canonical-booking-service', verified: true,
    observedAt: 9_500, now: 10_000,
  }), true);
});

test('stale availability, booking, and payment evidence is not accepted', () => {
  for (const kind of ['availability', 'booking', 'payment'] as const) {
    const result = assessTourismEvidence({
      kind, source: 'canonical-service', verified: true, observedAt: 1_000, now: 62_001,
    });
    assert.equal(result.status, 'stale', kind);
    assert.equal(result.requiresLiveVerification, true, kind);
    assert.equal(canClaimVerifiedTourismFact({
      kind, source: 'canonical-service', verified: true, observedAt: 1_000, now: 62_001,
    }), false);
  }
});

test('future and invalid observation timestamps are unknown', () => {
  assert.equal(assessTourismEvidence({
    kind: 'weather', source: 'official-source', verified: true, observedAt: 11_000, now: 10_000,
  }).status, 'unknown');
  assert.equal(assessTourismEvidence({
    kind: 'weather', source: 'official-source', verified: true, observedAt: 'not-a-date', now: 10_000,
  }).status, 'unknown');
});

test('stable general knowledge still requires a declared source to be called verified', () => {
  assert.equal(assessTourismEvidence({ kind: 'general' }).status, 'unknown');
  assert.equal(assessTourismEvidence({
    kind: 'general', source: 'approved-knowledge-base', verified: true, observedAt: 9_000, now: 10_000,
  }).status, 'verified');
  assert.ok(TOURISM_AI_GUARDRAILS.some(rule => rule.includes('No inventar precios')));
  assert.ok(TOURISM_AI_GUARDRAILS.some(rule => rule.includes('aprobación humana')));
});
