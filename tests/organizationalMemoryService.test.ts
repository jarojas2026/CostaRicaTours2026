import test from 'node:test';
import assert from 'node:assert/strict';
import { createCorrelationId, rememberOrganizationalFlow } from '../backend/organizationalMemoryService';

test('createCorrelationId is deterministic when a seed is supplied', () => {
  const a = createCorrelationId('gmail:thread-123');
  const b = createCorrelationId('gmail:thread-123');
  const c = createCorrelationId('gmail:thread-456');
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^corr_[a-f0-9]{24}$/);
});

test('organizational memory degrades safely when persistence is unavailable', async () => {
  const result = await rememberOrganizationalFlow({
    channel: 'test',
    externalMessageId: 'message-1',
    externalThreadId: 'thread-1',
    direction: 'inbound',
    actor: 'customer',
    intent: 'availability_request',
    status: 'received',
    confirmedFacts: [{
      key: 'partySize',
      value: 2,
      truth: 'CUSTOMER_PROVIDED',
      sourceChannel: 'test'
    }],
    pendingFacts: [{
      key: 'availability',
      value: null,
      truth: 'UNVERIFIED',
      sourceChannel: 'test'
    }],
    nextAction: 'verify_live_availability'
  });
  assert.equal(typeof result.correlationId, 'string');
  assert.equal(result.externalMessageId, 'message-1');
  assert.equal(result.confirmedFacts?.[0]?.truth, 'CUSTOMER_PROVIDED');
  assert.equal(result.pendingFacts?.[0]?.truth, 'UNVERIFIED');
});
