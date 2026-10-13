import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertAgentRunTransition,
  buildAgentRun,
  buildAgentRunStep,
} from '../backend/agentRunLedgerService';

const actor = {
  kind: 'owner' as const,
  id: 'owner-test',
  email: 'owner@example.invalid',
};

test('new agent run is queued and does not fabricate timing, error or cost telemetry', () => {
  const run = buildAgentRun({
    requestedBy: actor,
    objective: 'Revisar una solicitud sin ejecutar acciones comerciales.',
    agentId: 'concierge',
    id: 'run_test',
    now: new Date('2026-10-12T18:00:00.000Z'),
  });
  assert.equal(run.status, 'queued');
  assert.equal(run.startedAt, null);
  assert.equal(run.completedAt, null);
  assert.equal(run.durationMs, null);
  assert.equal(run.cost, null);
  assert.equal(run.error, null);
  assert.equal(run.lastStepSequence, 0);
});

test('run ledger allows only monotonic lifecycle transitions', () => {
  assert.doesNotThrow(() => assertAgentRunTransition('queued', 'running'));
  assert.doesNotThrow(() => assertAgentRunTransition('running', 'waiting_approval'));
  assert.doesNotThrow(() => assertAgentRunTransition('waiting_approval', 'running'));
  assert.doesNotThrow(() => assertAgentRunTransition('running', 'completed'));
  assert.throws(() => assertAgentRunTransition('completed', 'running'));
  assert.throws(() => assertAgentRunTransition('queued', 'completed'));
});

test('step ledger stores an auditable decision summary, not private chain-of-thought', () => {
  const step = buildAgentRunStep({
    runId: 'run_test',
    agentId: 'concierge',
    sequence: 1,
    status: 'completed',
    decisionSummary: 'Se consultó el catálogo porque el viajero pidió una recomendación.',
    result: {
      status: 'ok',
      summary: 'Catálogo consultado; no se confirmó disponibilidad.',
      evidenceRefs: ['catalog:tours'],
    },
    id: 'step_test',
    now: new Date('2026-10-12T18:00:01.000Z'),
  });
  assert.equal(step.sequence, 1);
  assert.match(step.decisionSummary, /catálogo/i);
  assert.equal(Object.prototype.hasOwnProperty.call(step, 'chainOfThought'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(step, 'thoughts'), false);
});

test('step ledger rejects invalid sequence and negative duration', () => {
  assert.throws(() => buildAgentRunStep({
    runId: 'run_test',
    agentId: 'concierge',
    sequence: 0,
    status: 'started',
    decisionSummary: 'Inicio.',
  }));
  assert.throws(() => buildAgentRunStep({
    runId: 'run_test',
    agentId: 'concierge',
    sequence: 1,
    status: 'completed',
    decisionSummary: 'Fin.',
    durationMs: -1,
  }));
});
