import assert from 'node:assert/strict';
import test from 'node:test';
import { generateScenarios, simulateTourismScenario, SANDBOX_MARKER } from './sandboxTourismScenarioEngine';

test('isolated digital city simulator covers every declared tourism combination', () => {
  let total = 0;
  const actions = new Set<string>();
  for (const scenario of generateScenarios()) {
    const result = simulateTourismScenario(scenario);
    total++;
    actions.add(result.action);
    assert.equal(result.marker, SANDBOX_MARKER);
    assert.equal(result.bookingCreated, false);
    assert.equal(result.paymentCreated, false);
    assert.equal(result.providerNotificationSent, false);
    assert.equal(result.quote.amount, null);
    assert.equal(result.quote.confirmed, false);
    assert.ok(result.customerMessage.length > 15);
    if (result.state === 'confirmed') {
      assert.equal(result.action, 'ready_for_operations');
      assert.equal(scenario.availability, 'verified');
      assert.equal(scenario.provider, 'confirmed');
      assert.equal(scenario.weather, 'normal');
      assert.equal(scenario.payment, 'verified-paid');
    }
  }
  assert.equal(total, 4860);
  assert.deepEqual([...actions].sort(), [
    'await_payment','await_provider','offer_alternative','ready_for_operations',
    'review_payment','verify_inventory','weather_review'
  ].sort());
});

test('unknown availability cannot yield a confirmed booking', () => {
  for (const s of generateScenarios()) {
    if (s.availability !== 'unknown') continue;
    const outcome = simulateTourismScenario(s);
    assert.equal(outcome.action, 'verify_inventory');
    assert.equal(outcome.state, 'prospect');
  }
});

test('unavailable inventory and declined providers cannot produce confirmed bookings', () => {
  for (const s of generateScenarios()) {
    if (s.availability !== 'unavailable' && s.provider !== 'declined') continue;
    const outcome = simulateTourismScenario(s);
    assert.notEqual(outcome.state, 'confirmed');
  }
});
