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

/**
 * Accept both canonical values and the legacy Spanish/English values that
 * already exist in Firestore. Canonical states must round-trip unchanged;
 * otherwise an existing `provider_pending` booking can be accidentally
 * interpreted as a new prospect and bypass transition protection.
 */
const LEGACY_MAP: Record<string, BookingLifecycle> = {
  prospect: 'prospect',
  prospecto: 'prospect',
  hold: 'hold',
  pending: 'payment_pending',
  payment_pending: 'payment_pending',
  pendiente_pago: 'payment_pending',
  paid: 'paid',
  pagada: 'paid',
  provider_pending: 'provider_pending',
  'provider-pending': 'provider_pending',
  proveedor_pendiente: 'provider_pending',
  confirmed: 'confirmed',
  confirmada: 'confirmed',
  in_operation: 'in_operation',
  'in-operation': 'in_operation',
  en_operacion: 'in_operation',
  completed: 'completed',
  completada: 'completed',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  cancelada: 'cancelled',
  refund: 'refunded',
  refunded: 'refunded',
  reembolsada: 'refunded'
};

/**
 * Confirmation is provider-owned. Payment and customer approval may advance
 * commercial intent, but neither may skip the provider_pending stage.
 */
const TRANSITIONS: Record<BookingLifecycle, BookingLifecycle[]> = {
  prospect: ['hold', 'cancelled'],
  hold: ['payment_pending', 'cancelled'],
  payment_pending: ['paid', 'cancelled'],
  paid: ['provider_pending', 'cancelled', 'refunded'],
  provider_pending: ['confirmed', 'cancelled'],
  confirmed: ['in_operation', 'cancelled'],
  in_operation: ['completed', 'cancelled'],
  completed: [],
  cancelled: ['refunded'],
  refunded: []
};

export function normalizeBookingLifecycle(status?: string, paymentStatus?: string): BookingLifecycle {
  const payment = LEGACY_MAP[String(paymentStatus || '').trim().toLowerCase()];
  if (payment === 'paid' || payment === 'refunded') return payment;
  return LEGACY_MAP[String(status || '').trim().toLowerCase()] || 'prospect';
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
