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

test('unverified and whitespace-only source evidence cannot support a claim', () => {
  assert.equal(assessTourismEvidence({
    kind: 'price', source: 'official-source', verified: false, observedAt: 9_900, now: 10_000,
  }).status, 'unknown');
  assert.equal(assessTourismEvidence({
    kind: 'price', source: '   ', verified: true, observedAt: 9_900, now: 10_000,
  }).status, 'unknown');
});

test('freshness threshold is inclusive and evidence becomes stale after the threshold', () => {
  const evidence = {
    kind: 'availability' as const, source: 'booking-service', verified: true,
    observedAt: 1_000, now: 61_000,
  };
  assert.equal(assessTourismEvidence(evidence).status, 'verified');
  assert.equal(assessTourismEvidence({ ...evidence, now: 61_001 }).status, 'stale');
});

test('zero validity window expires as soon as the observation is older than now', () => {
  const evidence = {
    kind: 'weather' as const, source: 'weather-service', verified: true,
    observedAt: 10_000, now: 10_000, validForMs: 0,
  };
  assert.equal(assessTourismEvidence(evidence).status, 'verified');
  assert.equal(assessTourismEvidence({ ...evidence, now: 10_001 }).status, 'stale');
});
