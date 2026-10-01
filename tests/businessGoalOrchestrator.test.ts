import test from 'node:test';
import assert from 'node:assert/strict';
import { executeBusinessGoal } from '../backend/businessGoalOrchestrator';

test('lodging request produces a verification-first execution contract', async () => {
  const result = await executeBusinessGoal({
    channel: 'email:gmail',
    messageId: 'customer-message-1',
    threadId: 'thread-lodging-1',
    actor: 'customer',
    intent: 'travel_request',
    message: 'Necesito hospedaje en Puerto Viejo con desayuno y parqueo.',
    requirements: {
      destination: 'Puerto Viejo de Limón',
      adults: 2,
      childAgeYears: 2.5,
      nightlyBudgetUsd: 200,
      breakfast: true,
      parking: true
    }
  });

  assert.equal(result.goal, 'lodging_quote');
  assert.equal(result.customerCommunicationState, 'awaiting_verification');
  assert.ok(result.pendingFacts.includes('availability'));
  assert.ok(result.pendingFacts.includes('finalPrice'));
  assert.ok(result.pendingFacts.includes('childPolicy'));
  assert.ok(result.confirmedFacts.length >= 6);
  assert.match(result.nextAction, /verify_lodging|lodging/i);
});

test('same email thread preserves execution continuity', async () => {
  const first = await executeBusinessGoal({
    channel: 'email:gmail', messageId: 'm1', threadId: 'same-thread', actor: 'customer', message: 'Cotizar hotel'
  });
  const second = await executeBusinessGoal({
    channel: 'email:gmail', messageId: 'm2', threadId: 'same-thread', actor: 'customer', message: 'También necesito parqueo'
  });
  assert.equal(first.sessionId, second.sessionId);
  assert.equal(first.correlationId, second.correlationId);
});
