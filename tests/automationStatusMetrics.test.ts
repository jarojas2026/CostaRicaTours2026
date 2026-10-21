import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeNativeAutomationEvents } from '../backend/automationStatusMetrics';

test('no telemetry is unknown, never 100% success or 2ms latency', () => {
  assert.deepEqual(summarizeNativeAutomationEvents([]), {
    observedEvents: 0,
    eligibleOutcomes: 0,
    warningEvents: 0,
    successRate: null,
    averageReportedDurationMs: null,
  });
});

test('warnings are not counted as successful completed workflows', () => {
  const result = summarizeNativeAutomationEvents([
    { status: 'warning', durationMs: 0 },
    { status: 'success', durationMs: 30 },
    { status: 'error', durationMs: 10 },
  ]);
  assert.equal(result.observedEvents, 3);
  assert.equal(result.warningEvents, 1);
  assert.equal(result.eligibleOutcomes, 2);
  assert.equal(result.successRate, 50);
  assert.equal(result.averageReportedDurationMs, 20);
});

test('only warnings gives no success rate or duration', () => {
  const result = summarizeNativeAutomationEvents([{ status: 'warning', durationMs: 5 }]);
  assert.equal(result.successRate, null);
  assert.equal(result.averageReportedDurationMs, null);
});

test('placeholder durations never masquerade as latency measurements', () => {
  const result = summarizeNativeAutomationEvents([
    { status: 'success', durationMs: 0 },
    { status: 'error', durationMs: Number.NaN },
  ]);
  assert.equal(result.successRate, 50);
  assert.equal(result.averageReportedDurationMs, null);
});

test('successful observed outcomes report 100% only with evidence', () => {
  const result = summarizeNativeAutomationEvents([{ status: 'success', durationMs: 21 }]);
  assert.equal(result.successRate, 100);
});
