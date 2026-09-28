export type PayoutEligibilityReason =
  | 'already_paid'
  | 'payout_in_progress'
  | 'payment_not_verified'
  | 'booking_not_provider_confirmed'
  | 'provider_confirmation_missing'
  | 'provider_id_missing'
  | 'invalid_total_usd'
  | 'invalid_tour_date'
  | 'tour_not_completed';

export type PayoutEligibility =
  | { eligible: true; totalUSD: number; providerId: string; tourDate: string }
  | { eligible: false; reason: PayoutEligibilityReason };

export function costaRicaDateString(date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
}

/**
 * Financial settlement policy.
 *
 * A provider payout is intentionally stricter than a customer-facing booking
 * confirmation. Money can leave the platform only after all authoritative
 * evidence is present and the scheduled service date is already in the past.
 */
export function evaluatePayoutEligibility(
  booking: Record<string, any>,
  todayCR = costaRicaDateString()
): PayoutEligibility {
  const payoutStatus = String(booking?.payoutStatus || '').trim().toLowerCase();
  if (payoutStatus === 'paid') return { eligible: false, reason: 'already_paid' };
  if (payoutStatus === 'processing' || payoutStatus === 'submitted') {
    return { eligible: false, reason: 'payout_in_progress' };
  }

  if (String(booking?.paymentStatus || '').trim().toLowerCase() !== 'completed') {
    return { eligible: false, reason: 'payment_not_verified' };
  }

  if (String(booking?.status || '').trim().toLowerCase() !== 'confirmada') {
    return { eligible: false, reason: 'booking_not_provider_confirmed' };
  }

  const providerEvidence = [booking?.providerStatus, booking?.serviceOrderStatus]
    .map((value) => String(value || '').trim().toLowerCase());
  if (!providerEvidence.some((value) => value === 'confirmed' || value === 'confirmada')) {
    return { eligible: false, reason: 'provider_confirmation_missing' };
  }

  const providerId = String(booking?.providerId || booking?.providerInfo?.id || '').trim();
  if (!providerId) return { eligible: false, reason: 'provider_id_missing' };

  const totalUSD = Number(booking?.totalUSD);
  if (!Number.isFinite(totalUSD) || totalUSD <= 0) {
    return { eligible: false, reason: 'invalid_total_usd' };
  }

  const tourDate = String(booking?.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tourDate)) {
    return { eligible: false, reason: 'invalid_tour_date' };
  }

  // Never settle the same day or before the service. This avoids paying a
  // provider for a future or merely scheduled experience.
  if (tourDate >= todayCR) {
    return { eligible: false, reason: 'tour_not_completed' };
  }

  return { eligible: true, totalUSD, providerId, tourDate };
}

export function isValidCommissionRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1;
}
