import test from 'node:test';
import assert from 'node:assert/strict';
import { completeVerificationTask, createVerificationTask, verificationTaskId } from '../backend/verificationTaskService';

test('verification task id is deterministic regardless of fact ordering', () => {
  const base = {
    correlationId: 'corr_abc',
    sessionId: 'session_1',
    goal: 'lodging_quote' as const
  };
  const a = verificationTaskId({ ...base, requiredFacts: ['availability', 'finalPrice'] });
  const b = verificationTaskId({ ...base, requiredFacts: ['finalPrice', 'availability'] });
  assert.equal(a, b);
  assert.match(a, /^verify_[a-f0-9]{28}$/);
});

test('verification task degrades safely without Firestore', async () => {
  const result = await createVerificationTask({
    correlationId: 'corr_test',
    sessionId: 'session_test',
    goal: 'lodging_quote',
    requiredFacts: ['availability', 'finalPrice'],
    nextAction: 'verify_lodging',
    sourceChannel: 'test'
  });
  assert.equal(result.task.status, 'pending');
  assert.deepEqual(result.task.requiredFacts, ['availability', 'finalPrice']);
});

test('verification completion rejects non-authoritative evidence', async () => {
  await assert.rejects(() => completeVerificationTask({
    taskId: 'verify_test',
    verifiedFacts: ['availability'],
    evidence: [{ source: 'internal_inference', authoritative: false, observedAt: new Date().toISOString() }]
  }), /fresh_authoritative_evidence/);
});
