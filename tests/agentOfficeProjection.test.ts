import assert from 'node:assert/strict';
import test from 'node:test';
import { projectAgentOffice } from '../backend/agentOfficeProjection';

const now = '2026-10-11T18:00:00.000Z';

const agents = [
  {
    id: 'concierge',
    mission: 'Atender viajeros',
    status: 'working' as const,
    lastHeartbeatAt: '2026-10-11T17:59:50.000Z',
    currentTask: {
      runId: 'run_1',
      objective: 'Atender consulta',
      startedAt: '2026-10-11T17:59:00.000Z',
    },
  },
  {
    id: 'booking',
    mission: 'Reservas',
    status: 'idle' as const,
    lastHeartbeatAt: '2026-10-11T17:58:59.000Z',
    currentTask: null,
  },
];

test('office trusts a runtime state only while the heartbeat is fresh', () => {
  const projection = projectAgentOffice(agents, [
    { type: 'agent.step', createdAt: '2026-10-11T17:59:55Z', payload: { agentId: 'concierge', email: 'hidden@example.com' } },
  ], now, true);

  assert.equal(projection.registered, 2);
  assert.equal(projection.recentlyObserved, 1);
  assert.equal(projection.active, 1);
  assert.equal(projection.noSignal, 1);
  assert.equal(projection.agents[0].status, 'working');
  assert.equal(projection.agents[0].signal, 'recent_activity');
  assert.equal(projection.agents[0].currentTask?.runId, 'run_1');
  assert.equal(projection.agents[1].status, 'no_signal');
  assert.equal(projection.agents[1].signal, 'no_recent_signal');
  assert.equal(JSON.stringify(projection).includes('hidden@example.com'), false);
});

test('61 seconds without heartbeat becomes no_signal even if generic events are recent', () => {
  const projection = projectAgentOffice([{
    id: 'booking',
    mission: 'Reservas',
    status: 'working' as const,
    lastHeartbeatAt: '2026-10-11T17:58:59.000Z',
    currentTask: null,
  }], [
    { type: 'conversation.turn.completed', createdAt: '2026-10-11T17:59:59Z', payload: { agentId: 'booking' } },
  ], now, true);

  assert.equal(projection.agents[0].status, 'no_signal');
  assert.equal(projection.agents[0].signal, 'no_recent_signal');
  assert.equal(projection.agents[0].lastEventType, 'conversation.turn.completed');
});

test('telemetry outage never masquerades as idle or healthy', () => {
  const projection = projectAgentOffice(agents, [], now, false);
  assert.equal(projection.source, 'unavailable');
  assert.equal(projection.recentlyObserved, 0);
  assert.ok(projection.agents.every((agent) => agent.status === 'no_signal'));
  assert.ok(projection.agents.every((agent) => agent.signal === 'telemetry_unavailable'));
});

test('paused and revoked governance states remain visible without a fresh heartbeat', () => {
  const projection = projectAgentOffice([
    { id: 'supervisor', mission: 'Supervisor', status: 'paused' as const, lastHeartbeatAt: null },
    { id: 'learning', mission: 'Learning', status: 'revoked' as const, lastHeartbeatAt: null },
  ], [], now, true);

  assert.equal(projection.agents[0].status, 'paused');
  assert.equal(projection.agents[1].status, 'revoked');
  assert.ok(projection.agents.every((agent) => agent.signal === 'no_recent_signal'));
});

test('latest correctly timestamped event wins irrespective of input order', () => {
  const projection = projectAgentOffice([agents[0]], [
    { type: 'recent', createdAt: '2026-10-11T17:59:59Z', payload: { agentId: 'concierge' } },
    { type: 'old', createdAt: '2026-10-11T17:56:00Z', payload: { agentId: 'concierge' } },
  ], now, true);
  assert.equal(projection.agents[0].lastEventType, 'recent');
});

test('future heartbeat is rejected as telemetry rather than treated as live', () => {
  const projection = projectAgentOffice([{
    id: 'concierge',
    mission: 'Atender viajeros',
    status: 'working' as const,
    lastHeartbeatAt: '2026-10-11T18:10:00.000Z',
  }], [], now, true);
  assert.equal(projection.agents[0].status, 'no_signal');
  assert.equal(projection.agents[0].lastHeartbeatAt, null);
});
