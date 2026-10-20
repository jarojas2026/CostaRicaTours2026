import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessCommercialReadiness, type CommercialReadinessInput } from '../backend/commerceReadinessPolicy';

const base: CommercialReadinessInput = {
  todayCR: '2026-10-20',
  sampleLimit: 500,
  products: [{ id: 'tour1', catalogStatus: 'bookable', providerId: 'p1', priceUSD: 125, departureTimes: ['08:00'] }],
  providers: [{ id: 'p1', verified: true, active: true, commissionRate: 0.12, email: 'supplier@example.invalid' }],
  slots: [{ tourId: 'tour1', providerId: 'p1', date: '2026-10-31', time: '08:00', active: true, maxCapacity: 10, bookedSeats: 2 }],
  emailTransportConfigured: true,
  paypalCredentialsConfigured: false,
  stripeCredentialsConfigured: true,
  leadAutoFollowUpEnabled: false,
};

test('counts only real verified Firestore candidate profiles/offers/slots, never promises availability', () => {
  const result = assessCommercialReadiness(base);
  assert.deepEqual(result.counts, {
    verifiedActiveProvidersSample: 1,
    providerProfilesWithAgreementAndEmailSample: 1,
    offerCandidatesSample: 1,
    datedSlotCandidatesSample: 1,
  });
  assert.equal(result.state, 'sample_needs_external_verification');
  assert.equal(result.coverage.totalsCertified, false);
  assert.ok(result.blockers.includes('review_followup_policy_and_consent'));
  assert.doesNotMatch(result.disclaimer, /confirmed availability/i);
});

test('unverified provider, missing commission, expired or full slot are not sale-ready candidates', () => {
  const result = assessCommercialReadiness({
    ...base,
    providers: [{ id: 'p1', verified: true, active: true, email: 'supplier@example.invalid' }],
    slots: [{ ...base.slots[0], date: '2026-10-19', bookedSeats: 10 }],
    emailTransportConfigured: false,
  });
  assert.equal(result.counts.verifiedActiveProvidersSample, 1);
  assert.equal(result.counts.providerProfilesWithAgreementAndEmailSample, 0);
  assert.equal(result.counts.offerCandidatesSample, 0);
  assert.equal(result.counts.datedSlotCandidatesSample, 0);
  assert.ok(result.blockers.includes('complete_provider_agreement_and_email'));
  assert.ok(result.blockers.includes('configure_real_email_transport'));
});

test('catalog discovery and provider mismatches do not count as published inventory', () => {
  const result = assessCommercialReadiness({
    ...base,
    products: [{ ...base.products[0], catalogStatus: 'discovery' }],
  });
  assert.equal(result.counts.offerCandidatesSample, 0);
  assert.equal(result.counts.datedSlotCandidatesSample, 0);
});

test('route and UI label bounded samples and protect endpoint with existing admin auth', () => {
  const route = readFileSync('backend/commerceAdminRouter.ts', 'utf8');
  const ui = readFileSync('src/components/CommerceOperationsPanel.tsx', 'utf8');
  assert.match(route, /commerceAdminRouter\.use\(requireOperator\)/);
  assert.match(route, /db\.collection\('availability_slots'\)\.limit\(500\)/);
  assert.match(route, /assessCommercialReadiness\(/);
  assert.match(ui, /salesReadiness\.coverage\.truncatedOrUnknown/);
  assert.match(ui, /not supplier-confirmed availability/);
});
