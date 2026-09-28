import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canTransitionBooking,
  nextSafeTransitions,
  normalizeBookingLifecycle,
} from '../backend/bookingStateMachine';

test('legacy pending states normalize to payment_pending', () => {
  assert.equal(normalizeBookingLifecycle('pendiente_pago'), 'payment_pending');
  assert.equal(normalizeBookingLifecycle('pending'), 'payment_pending');
});

test('verified payment normalizes to paid without implying provider confirmation', () => {
  assert.equal(normalizeBookingLifecycle('pendiente_pago', 'paid'), 'paid');
  assert.notEqual(normalizeBookingLifecycle('pendiente_pago', 'paid'), 'confirmed');
});

test('provider_pending is a distinct lifecycle stage', () => {
  assert.equal(normalizeBookingLifecycle('provider_pending'), 'provider_pending');
  assert.ok(nextSafeTransitions('provider_pending').includes('confirmed'));
  assert.equal(canTransitionBooking('provider_pending', 'completed'), false);
});

test('confirmed service must enter operation before completion', () => {
  assert.equal(canTransitionBooking('confirmed', 'in_operation'), true);
  assert.equal(canTransitionBooking('confirmed', 'completed'), false);
  assert.equal(canTransitionBooking('in_operation', 'completed'), true);
});

test('terminal completed bookings cannot silently reopen', () => {
  assert.deepEqual(nextSafeTransitions('completed'), []);
  assert.equal(canTransitionBooking('completed', 'paid'), false);
  assert.equal(canTransitionBooking('completed', 'confirmed'), false);
});

test('cancelled booking may only continue to refund', () => {
  assert.deepEqual(nextSafeTransitions('cancelled'), ['refunded']);
  assert.equal(canTransitionBooking('cancelled', 'confirmed'), false);
});
