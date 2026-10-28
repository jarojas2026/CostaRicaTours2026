export type TourismFactKind = 'price' | 'availability' | 'booking' | 'payment' | 'weather' | 'road' | 'opening-hours' | 'safety' | 'general';
export type TourismEvidenceStatus = 'verified' | 'estimated' | 'stale' | 'unknown';

export interface TourismEvidence {
  kind: TourismFactKind;
  source?: string | null;
  observedAt?: string | number | Date | null;
  validForMs?: number;
  verified?: boolean;
  now?: number;
}

/**
 * Pure policy: it never fetches data or calls a model. Dynamic tourism facts are
 * unknown unless a source and a valid observation time are explicitly supplied.
 */
export function assessTourismEvidence(evidence: TourismEvidence): {
  status: TourismEvidenceStatus;
  requiresLiveVerification: boolean;
  reason: string;
} {
  const live = evidence.kind !== 'general';
  if (!evidence.verified || !String(evidence.source || '').trim() || evidence.observedAt == null) {
    return { status: 'unknown', requiresLiveVerification: live, reason: 'evidence_missing' };
  }

  const observedAt = evidence.observedAt instanceof Date
    ? evidence.observedAt.getTime()
    : typeof evidence.observedAt === 'number'
      ? evidence.observedAt
      : Date.parse(evidence.observedAt);
  const now = Number.isFinite(evidence.now) ? Number(evidence.now) : Date.now();
  if (!Number.isFinite(observedAt) || observedAt > now) {
    return { status: 'unknown', requiresLiveVerification: live, reason: 'invalid_observation_time' };
  }

  if (live) {
    if (evidence.validForMs !== undefined && (!Number.isFinite(evidence.validForMs) || evidence.validForMs < 0)) {
      return { status: 'unknown', requiresLiveVerification: true, reason: 'invalid_validity_window' };
    }

    const defaultValidityMs = evidence.kind === 'availability' || evidence.kind === 'booking' || evidence.kind === 'payment'
      ? 60_000
      : evidence.kind === 'weather' || evidence.kind === 'road' || evidence.kind === 'opening-hours'
        ? 30 * 60_000
        : 24 * 60 * 60_000;
    const validForMs = evidence.validForMs ?? defaultValidityMs;
    if (now - observedAt > validForMs) {
      return { status: 'stale', requiresLiveVerification: true, reason: 'evidence_expired' };
    }
  }

  return { status: 'verified', requiresLiveVerification: false, reason: 'source_verified' };
}

export const TOURISM_AI_GUARDRAILS = [
  'No inventar precios, cupos, reservas, pagos, horarios, cierres ni respuestas de operadores.',
  'Datos vivos sin fuente verificable y marca temporal se consideran desconocidos.',
  'Una estimación nunca equivale a una confirmación de reserva, pago o seguridad.',
  'No revelar al cliente nombres, contactos ni canales internos de proveedores.',
  'Pagos, reembolsos, publicaciones y mensajes sensibles requieren aprobación humana.',
  'Si una fuente está vencida o falla, explicar la incertidumbre y solicitar verificación.'
] as const;

export function canClaimVerifiedTourismFact(evidence: TourismEvidence): boolean {
  return assessTourismEvidence(evidence).status === 'verified';
}
