/**
 * Read-only, bounded commercial preflight. A Firestore product/slot is a
 * candidate for sale, NOT verified supplier availability or payment readiness.
 * No mutation, secret, provider contact or simulated KPI in this projection.
 */
import { isValidCommissionRate } from './providerPayoutPolicy';

export type CommercialReadinessInput = {
  products: readonly Record<string, any>[];
  providers: readonly Record<string, any>[];
  slots: readonly Record<string, any>[];
  todayCR: string;
  sampleLimit: number;
  emailTransportConfigured: boolean;
  paypalCredentialsConfigured: boolean;
  stripeCredentialsConfigured: boolean;
  leadAutoFollowUpEnabled: boolean;
};

export function assessCommercialReadiness(input: CommercialReadinessInput) {
  const verified = input.providers.filter(p => p.verified === true && p.active === true);
  const operational = verified.filter(p =>
    isValidCommissionRate(p.commissionRate) &&
    typeof p.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())
  );
  const operationalIds = new Set(operational.map(p => String(p.id || '')));
  const offers = input.products.filter(p =>
    p.catalogStatus === 'bookable' &&
    typeof p.priceUSD === 'number' && Number.isFinite(p.priceUSD) && p.priceUSD > 0 &&
    Array.isArray(p.departureTimes) && p.departureTimes.length > 0 &&
    operationalIds.has(String(p.providerId || ''))
  );
  const offerById = new Map(offers.map(p => [String(p.id || ''), p]));
  const slots = input.slots.filter(s => {
    const offer = offerById.get(String(s.tourId || ''));
    if (!offer || s.active !== true || typeof s.date !== 'string' || s.date < input.todayCR) return false;
    if (String(s.providerId || '') !== String(offer.providerId || '')) return false;
    if (!offer.departureTimes.includes(s.time)) return false;
    const max = Number(s.maxCapacity), booked = Number(s.bookedSeats);
    return Number.isSafeInteger(max) && max > 0 && Number.isSafeInteger(booked) && booked >= 0 && booked < max;
  });

  const blockers: string[] = [];
  if (verified.length === 0) blockers.push('verify_real_provider');
  if (verified.length > operational.length) blockers.push('complete_provider_rate_and_email');
  if (offers.length === 0) blockers.push('publish_contractual_offer');
  if (slots.length === 0) blockers.push('publish_future_inventory');
  if (!input.emailTransportConfigured) blockers.push('configure_real_email_transport');
  if (!input.paypalCredentialsConfigured && !input.stripeCredentialsConfigured) blockers.push('configure_payment_gateway');
  if (!input.leadAutoFollowUpEnabled) blockers.push('review_followup_policy_and_consent');

  return {
    state: 'sample_needs_external_verification' as const,
    source: 'firestore_bounded_sample' as const,
    observedAt: new Date().toISOString(),
    coverage: {
      limitPerCollection: input.sampleLimit,
      productsSampled: input.products.length,
      providersSampled: input.providers.length,
      slotsSampled: input.slots.length,
      truncatedOrUnknown: [input.products.length, input.providers.length, input.slots.length]
        .some(count => count >= input.sampleLimit),
      totalsCertified: false,
    },
    counts: {
      verifiedActiveProvidersSample: verified.length,
      providerProfilesWithRateAndEmailSample: operational.length,
      offerCandidatesSample: offers.length,
      datedSlotCandidatesSample: slots.length,
    },
    configuration: {
      emailTransportConfigured: input.emailTransportConfigured,
      paymentCredentialsConfigured: input.paypalCredentialsConfigured || input.stripeCredentialsConfigured,
      leadAutoFollowUpEnabled: input.leadAutoFollowUpEnabled,
    },
    blockers,
    disclaimer: 'Candidate offers and slots are not provider-confirmed availability; credentials are not verified transactions.',
  };
}
