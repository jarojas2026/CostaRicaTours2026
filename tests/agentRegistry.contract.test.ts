import assert from 'node:assert/strict';
import test from 'node:test';
import { AGENT_IDENTITIES } from '../backend/agentKnowledgeFabric';
import { buildAgentRegistrySeed } from '../backend/agentRegistryService';
import { AGENT_OFFICE_DEFINITIONS, AGENT_OFFICE_IDS } from '../shared/agentOfficeTypes';

test('agent registry materializes every existing knowledge-fabric identity exactly once', () => {
  const seed = buildAgentRegistrySeed(new Date('2026-10-12T18:00:00.000Z'));
  const ids = seed.map((agent) => agent.id);
  assert.equal(seed.length, AGENT_IDENTITIES.length);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(
    [...ids].sort(),
    AGENT_IDENTITIES.map((agent) => agent.id).sort(),
  );
});

test('new registry agents fail closed with no fabricated telemetry or permissions', () => {
  const seed = buildAgentRegistrySeed(new Date('2026-10-12T18:00:00.000Z'));
  for (const agent of seed) {
    assert.equal(agent.status, 'no_signal');
    assert.equal(agent.currentTask, null);
    assert.equal(agent.lastHeartbeatAt, null);
    assert.equal(agent.usageToday, null);
    assert.equal(agent.model, null);
    assert.deepEqual(agent.allowedTools, []);
    assert.equal(agent.autonomyLevel, 0);
  }
});

test('every current agent has an explicit office and bilingual identity metadata', () => {
  const seed = buildAgentRegistrySeed(new Date('2026-10-12T18:00:00.000Z'));
  const allowed = new Set(AGENT_OFFICE_IDS);
  for (const agent of seed) {
    assert.equal(allowed.has(agent.office), true);
    assert.ok(agent.name.es.length > 0);
    assert.ok(agent.name.en.length > 0);
    assert.ok(agent.mission.es.length > 0);
    assert.ok(agent.mission.en.length > 0);
  }
  assert.deepEqual(
    AGENT_OFFICE_DEFINITIONS.map((office) => office.id),
    [...AGENT_OFFICE_IDS],
  );
});

test('registry preserves existing knowledge-fabric permission boundaries as metadata', () => {
  const seed = buildAgentRegistrySeed(new Date('2026-10-12T18:00:00.000Z'));
  for (const identity of AGENT_IDENTITIES) {
    const record = seed.find((agent) => agent.id === identity.id);
    assert.ok(record);
    assert.deepEqual(record.permissions.read, identity.canRead);
    assert.deepEqual(record.permissions.write, identity.canWrite);
    assert.deepEqual(record.permissions.escalation, identity.escalation);
  }
});
