import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AGENT_HEARTBEAT_INTERVAL_MS,
  AGENT_NO_SIGNAL_AFTER_MS,
  heartbeatAgeMs,
  isHeartbeatFresh,
} from '../backend/agentRuntimeService';
import { AGENT_OPERATIONAL_EVENT_TYPES } from '../backend/operationalEventBus';

test('agent runtime heartbeat contract is exactly 15s with no_signal after 60s', () => {
  assert.equal(AGENT_HEARTBEAT_INTERVAL_MS, 15_000);
  assert.equal(AGENT_NO_SIGNAL_AFTER_MS, 60_000);
  const now = new Date('2026-10-12T18:00:00.000Z');
  assert.equal(isHeartbeatFresh('2026-10-12T17:59:00.000Z', now), true);
  assert.equal(isHeartbeatFresh('2026-10-12T17:58:59.999Z', now), false);
  assert.equal(heartbeatAgeMs('2026-10-12T17:59:45.000Z', now), 15_000);
  assert.equal(heartbeatAgeMs(null, now), null);
});

test('operational event bus exposes the required agent lifecycle events', () => {
  const events = new Set(AGENT_OPERATIONAL_EVENT_TYPES);
  for (const event of [
    'agent.started',
    'agent.step',
    'agent.waiting_approval',
    'agent.completed',
    'agent.failed',
    'agent.heartbeat',
  ]) {
    assert.equal(events.has(event as any), true, `missing ${event}`);
  }
});

test('invalid or future heartbeat timestamps are not considered fresh', () => {
  const now = new Date('2026-10-12T18:00:00.000Z');
  assert.equal(isHeartbeatFresh('not-a-date', now), false);
  assert.equal(heartbeatAgeMs('2026-10-12T18:00:05.000Z', now), null);
  assert.equal(isHeartbeatFresh('2026-10-12T18:00:05.000Z', now), false);
});
