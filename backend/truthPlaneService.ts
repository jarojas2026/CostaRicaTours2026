export type TruthPlane = 'knowledge' | 'commercial' | 'operational' | 'transactional';
export type ProvenanceKind = 'STABLE_KNOWLEDGE' | 'LIVE_VERIFIED' | 'CUSTOMER_PROVIDED' | 'PROVIDER_PROVIDED' | 'AUTHORITATIVE_CATALOG' | 'UNVERIFIED';

export type EvidenceRef = {
  plane: TruthPlane;
  provenance: ProvenanceKind;
  source: string;
  observedAt?: string | null;
  entityId?: string | null;
  confidence?: number | null;
};

const CONFIRMED_PROVENANCE = new Set<ProvenanceKind>(['LIVE_VERIFIED', 'PROVIDER_PROVIDED', 'AUTHORITATIVE_CATALOG']);

export function isAuthoritativeEvidence(evidence?: EvidenceRef | null): boolean {
  if (!evidence) return false;
  if (!CONFIRMED_PROVENANCE.has(evidence.provenance)) return false;
  if (evidence.plane === 'operational' && evidence.provenance === 'AUTHORITATIVE_CATALOG') return false;
  if (evidence.plane === 'transactional' && evidence.provenance === 'AUTHORITATIVE_CATALOG') return false;
  return Boolean(String(evidence.source || '').trim());
}

export function canClaimConfirmed(evidence?: EvidenceRef | null): boolean {
  return isAuthoritativeEvidence(evidence) && evidence?.provenance !== 'UNVERIFIED';
}

export function truthPlanePolicy() {
  return {
    planes: ['knowledge', 'commercial', 'operational', 'transactional'] as TruthPlane[],
    invariant: 'AI inference cannot promote unverified data into live, provider or transactional truth.',
    confirmationRequiresEvidence: true
  };
}

export function describeEvidence(evidence?: EvidenceRef | null) {
  if (!evidence) return { confirmed: false, reason: 'missing_evidence' };
  return {
    confirmed: canClaimConfirmed(evidence),
    plane: evidence.plane,
    provenance: evidence.provenance,
    source: evidence.source,
    observedAt: evidence.observedAt || null,
    confidence: typeof evidence.confidence === 'number' ? evidence.confidence : null
  };
}
