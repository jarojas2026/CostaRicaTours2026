/**
 * Step 3 — Canonical booking lifecycle.
 * This is additive: legacy statuses are normalized into this model without
 * rewriting existing documents.
 */
export type BookingLifecycle =
  | 'prospect'
  | 'hold'
  | 'payment_pending'
  | 'paid'
  | 'provider_pending'
  | 'confirmed'
  | 'in_operation'
  | 'completed'
  | 'cancelled'
  | 'refunded';

const LEGACY_MAP: Record<string, BookingLifecycle> = {
  pending: 'payment_pending',
  pendiente_pago: 'payment_pending',
  paid: 'paid',
  completed: 'completed',
  confirmada: 'confirmed',
  confirmed: 'confirmed',
  cancelled: 'cancelled',
  cancelada: 'cancelled',
  refund: 'refunded',
  refunded: 'refunded'
};

const TRANSITIONS: Record<BookingLifecycle, BookingLifecycle[]> = {
  prospect: ['hold', 'cancelled'],
  hold: ['payment_pending', 'cancelled'],
  payment_pending: ['paid', 'cancelled'],
  paid: ['provider_pending', 'confirmed', 'cancelled', 'refunded'],
  provider_pending: ['confirmed', 'cancelled'],
  confirmed: ['in_operation', 'cancelled'],
  in_operation: ['completed', 'cancelled'],
  completed: [],
  cancelled: ['refunded'],
  refunded: []
};

export function normalizeBookingLifecycle(status?: string, paymentStatus?: string): BookingLifecycle {
  const payment = LEGACY_MAP[String(paymentStatus || '').toLowerCase()];
  if (payment === 'paid' || payment === 'refunded') return payment;
  return LEGACY_MAP[String(status || '').toLowerCase()] || 'prospect';
}

export function canTransitionBooking(from: BookingLifecycle, to: BookingLifecycle): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

export function assertBookingTransition(from: BookingLifecycle, to: BookingLifecycle): void {
  if (!canTransitionBooking(from, to)) {
    throw new Error(`Transición de reserva no permitida: ${from} → ${to}`);
  }
}

export function nextSafeTransitions(from: BookingLifecycle): BookingLifecycle[] {
  return [...TRANSITIONS[from]];
}
