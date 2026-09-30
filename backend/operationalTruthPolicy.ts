import type { OrganizationalFact, TruthState } from './organizationalMemoryService';

export type EvidenceSource =
  | 'customer_message'
  | 'provider_email'
  | 'provider_portal'
  | 'provider_api'
  | 'inventory_api'
  | 'authoritative_catalog'
  | 'internal_inference'
  | 'unknown';

export type Evidence = {
  source: EvidenceSource;
  authoritative?: boolean;
  observedAt?: string;
  expiresAt?: string;
  reference?: string;
};

const LIVE_SOURCES = new Set<EvidenceSource>(['provider_email', 'provider_portal', 'provider_api', 'inventory_api']);
const clean = (value: unknown, max = 160) => String(value ?? '').trim().slice(0, max);

export function isFreshEvidence(evidence: Evidence, now = Date.now()) {
  if (!evidence.observedAt) return false;
  const observed = Date.parse(evidence.observedAt);
  if (!Number.isFinite(observed) || observed > now + 60_000) return false;
  if (!evidence.expiresAt) return true;
  const expires = Date.parse(evidence.expiresAt);
  return Number.isFinite(expires) && expires > now;
}

export function canPromoteTruth(input: {
  from: TruthState;
  to: TruthState;
  evidence: Evidence;
}) {
  const { from, to, evidence } = input;
  if (from === to) return true;
  if (to === 'CUSTOMER_PROVIDED') return evidence.source === 'customer_message';
  if (to === 'PROVIDER_PROVIDED') {
    return ['provider_email', 'provider_portal', 'provider_api'].includes(evidence.source);
  }
  if (to === 'AUTHORITATIVE_CATALOG') {
    return evidence.source === 'authoritative_catalog' && evidence.authoritative === true;
  }
  if (to === 'LIVE_VERIFIED') {
    return evidence.authoritative === true && LIVE_SOURCES.has(evidence.source) && isFreshEvidence(evidence);
  }
  return false;
}

export function promoteFact(
  fact: OrganizationalFact,
  target: TruthState,
  evidence: Evidence
): OrganizationalFact {
  if (!canPromoteTruth({ from: fact.truth, to: target, evidence })) {
    throw new Error(`truth_promotion_denied:${fact.truth}->${target}:${clean(evidence.source)}`);
  }
  const now = new Date().toISOString();
  return {
    ...fact,
    truth: target,
    verifiedAt: target === 'LIVE_VERIFIED' ? now : fact.verifiedAt,
    expiresAt: evidence.expiresAt || fact.expiresAt,
    observedAt: evidence.observedAt || fact.observedAt
  };
}

export type BusinessGoal =
  | 'lodging_quote'
  | 'tour_quote'
  | 'transport_quote'
  | 'itinerary_quote'
  | 'reservation'
  | 'general_inquiry';

const REQUIRED_OPERATIONAL_FACTS: Record<BusinessGoal, string[]> = {
  lodging_quote: ['availability', 'finalPrice', 'taxesAndFees', 'roomConfiguration', 'childPolicy', 'requiredAmenities', 'cancellationPolicy', 'paymentTerms'],
  tour_quote: ['availability', 'finalPrice', 'schedule', 'pickupTerms', 'cancellationPolicy', 'providerEligibility'],
  transport_quote: ['availability', 'finalPrice', 'vehicleType', 'pickupTerms', 'providerEligibility'],
  itinerary_quote: ['componentAvailability', 'componentPrices', 'operationalFeasibility'],
  reservation: ['availability', 'serverAuthoritativePrice', 'providerEligibility', 'bookingPostconditions'],
  general_inquiry: []
};

export function requiredOperationalFacts(goal: BusinessGoal) {
  return [...REQUIRED_OPERATIONAL_FACTS[goal]];
}

export function inferBusinessGoal(intent: string, message = ''): BusinessGoal {
  const value = `${intent} ${message}`.toLowerCase();
  if (/hotel|hosped|alojamiento|lodging|accommodation/.test(value)) return 'lodging_quote';
  if (/transport|traslado|transfer|shuttle|veh[ií]culo/.test(value)) return 'transport_quote';
  if (/itinerario|itinerary|viaje completo|trip plan/.test(value)) return 'itinerary_quote';
  if (/reserv|booking|confirmar|book now/.test(value)) return 'reservation';
  if (/tour|excurs|actividad|activity/.test(value)) return 'tour_quote';
  return 'general_inquiry';
}

export function partitionFacts(facts: OrganizationalFact[]) {
  return facts.reduce((acc, fact) => {
    if (fact.truth === 'LIVE_VERIFIED' || fact.truth === 'AUTHORITATIVE_CATALOG') acc.verifiedFacts.push(fact);
    else if (fact.truth === 'UNVERIFIED') acc.pendingFacts.push(fact);
    else acc.confirmedFacts.push(fact);
    return acc;
  }, { confirmedFacts: [] as OrganizationalFact[], verifiedFacts: [] as OrganizationalFact[], pendingFacts: [] as OrganizationalFact[] });
}
