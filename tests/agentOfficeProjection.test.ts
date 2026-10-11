import assert from 'node:assert/strict';
import test from 'node:test';
import { projectAgentOffice } from '../backend/agentOfficeProjection';

const agents = [
  { id: 'concierge', mission: 'Atender viajeros' },
  { id: 'booking', mission: 'Reservas' }
];
const now = '2026-10-11T18:00:00.000Z';

test('office displays only registered agents and recent observed events', () => {
  const projection = projectAgentOffice(agents, [
    { type: 'conversation.turn.completed', createdAt: '2026-10-11T17:58:00Z', payload: { agentId: 'concierge', email: 'hidden@example.com' } },
    { type: 'secret', createdAt: '2026-10-11T17:59:00Z', payload: { agentId: 'unknown', token: 'not-for-client' } }
  ], now, true);
  assert.equal(projection.registered, 2);
  assert.equal(projection.recentlyObserved, 1);
  assert.equal(projection.agents[0].signal, 'recent_activity');
  assert.equal(projection.agents[1].signal, 'no_recent_signal');
  assert.equal(projection.agents[0].currentTask, null);
  assert.equal(JSON.stringify(projection).includes('hidden@example.com'), false);
  assert.equal(JSON.stringify(projection).includes('not-for-client'), false);
});

test('telemetry outage does not masquerade as idle or healthy', () => {
  const projection = projectAgentOffice(agents, [], now, false);
  assert.equal(projection.source, 'unavailable');
  assert.equal(projection.recentlyObserved, 0);
  assert.ok(projection.agents.every(a => a.signal === 'telemetry_unavailable'));
});

test('stale and future events are not treated as live execution', () => {
  const projection = projectAgentOffice(agents, [
    { type: 'old', createdAt: '2026-10-11T17:30:00Z', payload: { agentId: 'booking' } },
    { type: 'future', createdAt: '2026-10-12T17:30:00Z', payload: { agentId: 'concierge' } }
  ], now, true);
  assert.equal(projection.recentlyObserved, 0);
  assert.ok(projection.agents.every(a => a.signal === 'no_recent_signal'));
});

test('latest correctly timestamped event wins irrespective of input order', () => {
  const projection = projectAgentOffice(agents, [
    { type: 'recent', createdAt: '2026-10-11T17:59:00Z', payload: { agentId: 'booking' } },
    { type: 'old', createdAt: '2026-10-11T17:56:00Z', payload: { agentId: 'booking' } }
  ], now, true);
  assert.equal(projection.agents[1].lastEventType, 'recent');
});
