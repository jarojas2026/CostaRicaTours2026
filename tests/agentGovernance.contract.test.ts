import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { autonomyPolicy } from '../backend/autonomyPolicy';
import {
  abortAgentExecutions,
  activeAgentExecutionCount,
  registerAgentAbortController,
} from '../backend/agentCancellationRegistry';
import { buildAgentRegistrySeed } from '../backend/agentRegistryService';
import { readServerSource } from '../scripts/lib/serverSource';

test('money, outbound customer messaging, pricing and publication always require a human', () => {
  for (const level of [0, 1, 2, 3] as const) {
    for (const action of [
      'payment',
      'refund',
      'payout',
      'customer_message',
      'mass_message',
      'price_change',
      'publication',
    ] as const) {
      const policy = autonomyPolicy(level, action);
      assert.equal(policy.allowed, false, `${action} unexpectedly allowed at L${level}`);
      assert.equal(policy.requiresHuman, true);
    }
  }
});

test('registry starts with a revocable authorization epoch and zero autonomy', () => {
  const seed = buildAgentRegistrySeed(new Date('2026-10-12T18:00:00.000Z'));
  assert.ok(seed.length > 0);
  for (const agent of seed) {
    assert.equal(agent.autonomyLevel, 0);
    assert.equal(agent.authorizationEpoch, 1);
    assert.equal(agent.governanceUpdatedAt, null);
    assert.equal(agent.governanceControl, null);
  }
});

test('local revocation aborts every registered in-flight execution for an agent', () => {
  const first = new AbortController();
  const second = new AbortController();
  const unregisterFirst = registerAgentAbortController({ agentId: 'booking', runId: 'run_1', controller: first });
  const unregisterSecond = registerAgentAbortController({ agentId: 'booking', runId: 'run_2', controller: second });
  assert.equal(activeAgentExecutionCount('booking'), 2);
  assert.equal(abortAgentExecutions('booking', 'owner_revoked'), 2);
  assert.equal(first.signal.aborted, true);
  assert.equal(second.signal.aborted, true);
  assert.equal(activeAgentExecutionCount('booking'), 0);
  unregisterFirst();
  unregisterSecond();
});

test('server exposes governance mutations only through requireOwner', () => {
  const server = readServerSource();
  for (const route of [
    "agents/:agentId/autonomy', requireOwner",
    "agent-office/shutdown', requireOwner",
    "agent-office/resume-all', requireOwner",
    "approvals/:approvalId/approve', requireOwner",
    "approvals/:approvalId/reject', requireOwner",
  ]) {
    assert.ok(server.includes(route), `missing owner gate for ${route}`);
  }
  assert.match(server, /ai-command\/:commandId\/approve', requireOwner/);
  assert.match(server, /ai-command\/:commandId\/reject', requireOwner/);
});
