/**
 * Isolated tourism scenario simulator. No network, Firestore, credentials,
 * customer records, payments, or provider dispatch. Every output is a fixture.
 * The real booking lifecycle is imported rather than duplicated.
 */
import { canTransitionBooking, type BookingLifecycle } from '../backend/bookingStateMachine';

export const SANDBOX_MARKER = 'SIMULATED_ONLY_NOT_A_RESERVATION' as const;
export const TOURISM_VARIATIONS = {
  travelers: ['solo', 'couple', 'family', 'group'],
  needs: ['nature', 'adventure', 'accessibility', 'culture', 'relax'],
  dates: ['fixed', 'flexible', 'last-minute'],
  availability: ['verified', 'unavailable', 'unknown'],
  provider: ['confirmed', 'pending', 'declined'],
  weather: ['normal', 'heavy-rain', 'closure'],
  payment: ['unpaid', 'verified-paid', 'failed']
} as const;

export type Scenario = {
  travelers: typeof TOURISM_VARIATIONS.travelers[number];
  needs: typeof TOURISM_VARIATIONS.needs[number];
  dates: typeof TOURISM_VARIATIONS.dates[number];
  availability: typeof TOURISM_VARIATIONS.availability[number];
  provider: typeof TOURISM_VARIATIONS.provider[number];
  weather: typeof TOURISM_VARIATIONS.weather[number];
  payment: typeof TOURISM_VARIATIONS.payment[number];
};

export type ScenarioOutcome = {
  marker: typeof SANDBOX_MARKER;
  state: BookingLifecycle;
  action: 'verify_inventory' | 'offer_alternative' | 'weather_review' | 'await_provider' | 'await_payment' | 'review_payment' | 'ready_for_operations';
  customerMessage: string;
  quote: { kind: 'simulation'; currency: 'USD'; amount: null; confirmed: false };
  providerNotificationSent: false;
  paymentCreated: false;
  bookingCreated: false;
};

export function simulateTourismScenario(s: Scenario): ScenarioOutcome {
  let action: ScenarioOutcome['action'];
  let state: BookingLifecycle = 'prospect';
  if (s.availability === 'unknown') action = 'verify_inventory';
  else if (s.availability === 'unavailable' || s.provider === 'declined') action = 'offer_alternative';
  else if (s.weather !== 'normal') action = 'weather_review';
  else if (s.provider === 'pending') action = 'await_provider';
  else if (s.payment === 'failed') action = 'review_payment';
  else if (s.payment === 'unpaid') action = 'await_payment';
  else {
    // This is only a state-machine simulation, NOT evidence of a real charge,
    // inventory hold or provider acceptance.
    for (const next of ['hold','payment_pending','paid','provider_pending','confirmed'] as BookingLifecycle[]) {
      if (!canTransitionBooking(state, next)) throw new Error('Invalid canonical transition: ' + state + ' -> ' + next);
      state = next;
    }
    action = 'ready_for_operations';
  }
  const messages: Record<ScenarioOutcome['action'], string> = {
    verify_inventory: 'La disponibilidad requiere verificación antes de cotizar o reservar.',
    offer_alternative: 'La opción solicitada no está confirmada. Se necesita una alternativa.',
    weather_review: 'Se requiere revisión operativa de clima o cierres antes de continuar.',
    await_provider: 'Se necesita confirmación del proveedor.',
    await_payment: 'Se necesita una sesión de pago real y verificación del proveedor.',
    review_payment: 'El pago requiere revisión; no se puede confirmar una reserva.',
    ready_for_operations: 'Simulación completada; no se creó ninguna reserva real.'
  };
  return {
    marker: SANDBOX_MARKER, state, action, customerMessage: messages[action],
    quote: { kind: 'simulation', currency: 'USD', amount: null, confirmed: false },
    providerNotificationSent: false, paymentCreated: false, bookingCreated: false
  };
}

export function* generateScenarios(): Generator<Scenario> {
  const v = TOURISM_VARIATIONS;
  for (const travelers of v.travelers)
  for (const needs of v.needs)
  for (const dates of v.dates)
  for (const availability of v.availability)
  for (const provider of v.provider)
  for (const weather of v.weather)
  for (const payment of v.payment)
    yield { travelers, needs, dates, availability, provider, weather, payment };
}
