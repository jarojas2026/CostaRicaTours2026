import { getFirestoreDb } from './bookingService';
import type { DocumentReference } from 'firebase-admin/firestore';
import { emitAgentOperationalEvent } from './operationalEventBus';
import { assertAgentExecutionAuthorized, getAgentExecutionAuthorization } from './agentGovernanceService';
import type { AgentRecord, AgentStatus } from '../shared/agentOfficeTypes';

export const AGENT_HEARTBEAT_INTERVAL_MS = 15_000;
export const AGENT_NO_SIGNAL_AFTER_MS = 60_000;

export function heartbeatAgeMs(lastHeartbeatAt: string | null | undefined, now = new Date()): number | null {
  if (!lastHeartbeatAt) return null;
  const timestamp = Date.parse(lastHeartbeatAt);
  if (!Number.isFinite(timestamp) || timestamp > now.getTime()) return null;
  return now.getTime() - timestamp;
}

export function isHeartbeatFresh(lastHeartbeatAt: string | null | undefined, now = new Date()): boolean {
  const age = heartbeatAgeMs(lastHeartbeatAt, now);
  return age !== null && age <= AGENT_NO_SIGNAL_AFTER_MS;
}

function assertRuntimeStatus(status: AgentStatus): void {
  if (status === 'paused' || status === 'revoked') {
    throw new Error(`El agente no puede iniciar ejecución mientras está ${status}.`);
  }
}

async function loadAgentOrThrow(agentId: string): Promise<{ ref: DocumentReference; data: AgentRecord }> {
  const id = String(agentId || '').trim();
  if (!id) throw new Error('agentId es obligatorio.');
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible: no se puede actualizar telemetría del agente.');
  const ref = db.collection('agents').doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error(`Agente no registrado: ${id}`);
  return { ref, data: snapshot.data() as AgentRecord };
}

export async function startAgentExecutionRuntime(input: {
  agentId: string;
  runId: string;
  objective: string;
  now?: Date;
}): Promise<{ authorizationEpoch: number }> {
  const runId = String(input.runId || '').trim();
  const objective = String(input.objective || '').trim();
  if (!runId) throw new Error('runId es obligatorio.');
  if (!objective) throw new Error('objective es obligatorio.');

  const authorization = await assertAgentExecutionAuthorized(input.agentId);
  const { ref, data } = await loadAgentOrThrow(input.agentId);
  assertRuntimeStatus(data.status);
  const timestamp = (input.now ?? new Date()).toISOString();

  await ref.update({
    status: 'working',
    currentTask: {
      runId: runId.slice(0, 128),
      objective: objective.slice(0, 2000),
      startedAt: timestamp,
    },
    lastHeartbeatAt: timestamp,
    updatedAt: timestamp,
  });

  await emitAgentOperationalEvent({
    type: 'agent.started',
    agentId: data.id,
    runId,
    payload: { status: 'working', authorizationEpoch: authorization.authorizationEpoch },
  });
  return { authorizationEpoch: authorization.authorizationEpoch || 1 };
}

export async function heartbeatAgentExecution(input: {
  agentId: string;
  runId: string;
  now?: Date;
  expectedAuthorizationEpoch?: number;
}): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible: no se puede registrar heartbeat.');
  const agentId = String(input.agentId || '').trim();
  const runId = String(input.runId || '').trim();
  if (!agentId || !runId) throw new Error('agentId y runId son obligatorios.');

  const authorization = await getAgentExecutionAuthorization(agentId, input.expectedAuthorizationEpoch);
  if (!authorization.allowed) return false;

  const ref = db.collection('agents').doc(agentId);
  const timestamp = (input.now ?? new Date()).toISOString();

  const accepted = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new Error(`Agente no registrado: ${agentId}`);
    const agent = snapshot.data() as AgentRecord;
    if (agent.status === 'paused' || agent.status === 'revoked') return false;
    if (!agent.currentTask || agent.currentTask.runId !== runId) return false;

    transaction.update(ref, {
      lastHeartbeatAt: timestamp,
      updatedAt: timestamp,
      ...(agent.status === 'no_signal' ? { status: 'working' } : {}),
    });
    return true;
  });

  if (accepted) {
    await emitAgentOperationalEvent({
      type: 'agent.heartbeat',
      agentId,
      runId,
      payload: { heartbeatAt: timestamp },
    });
  }
  return accepted;
}

export async function recordAgentStepEvent(input: {
  agentId: string;
  runId: string;
  sequence: number;
  status: string;
  expectedAuthorizationEpoch?: number;
}): Promise<void> {
  await assertAgentExecutionAuthorized(input.agentId, input.expectedAuthorizationEpoch);
  await emitAgentOperationalEvent({
    type: 'agent.step',
    agentId: input.agentId,
    runId: input.runId,
    payload: {
      sequence: input.sequence,
      status: String(input.status || '').slice(0, 80),
    },
  });
}

export async function markAgentWaitingApproval(input: {
  agentId: string;
  runId: string;
  now?: Date;
  expectedAuthorizationEpoch?: number;
}): Promise<void> {
  await assertAgentExecutionAuthorized(input.agentId, input.expectedAuthorizationEpoch);
  const { ref, data } = await loadAgentOrThrow(input.agentId);
  assertRuntimeStatus(data.status);
  if (!data.currentTask || data.currentTask.runId !== input.runId) {
    throw new Error('La ejecución no coincide con la tarea actual del agente.');
  }
  const timestamp = (input.now ?? new Date()).toISOString();
  await ref.update({
    status: 'waiting_approval',
    lastHeartbeatAt: timestamp,
    updatedAt: timestamp,
  });
  await emitAgentOperationalEvent({
    type: 'agent.waiting_approval',
    agentId: data.id,
    runId: input.runId,
    payload: { status: 'waiting_approval' },
  });
}

export async function markAgentExecutionCompleted(input: {
  agentId: string;
  runId: string;
  now?: Date;
}): Promise<void> {
  const { ref, data } = await loadAgentOrThrow(input.agentId);
  if (data.currentTask && data.currentTask.runId !== input.runId) {
    throw new Error('La ejecución no coincide con la tarea actual del agente.');
  }
  const timestamp = (input.now ?? new Date()).toISOString();
  await ref.update({
    status: data.status === 'revoked' ? 'revoked' : data.status === 'paused' ? 'paused' : 'idle',
    currentTask: null,
    lastHeartbeatAt: timestamp,
    updatedAt: timestamp,
  });
  await emitAgentOperationalEvent({
    type: 'agent.completed',
    agentId: data.id,
    runId: input.runId,
    payload: { status: data.status === 'revoked' ? 'revoked' : data.status === 'paused' ? 'paused' : 'idle' },
  });
}

export async function markAgentExecutionFailed(input: {
  agentId: string;
  runId: string;
  errorCode?: string;
  now?: Date;
}): Promise<void> {
  const { ref, data } = await loadAgentOrThrow(input.agentId);
  if (data.currentTask && data.currentTask.runId !== input.runId) {
    throw new Error('La ejecución no coincide con la tarea actual del agente.');
  }
  const timestamp = (input.now ?? new Date()).toISOString();
  const nextStatus: AgentStatus = data.status === 'revoked'
    ? 'revoked'
    : data.status === 'paused'
      ? 'paused'
      : 'blocked';
  await ref.update({
    status: nextStatus,
    lastHeartbeatAt: timestamp,
    updatedAt: timestamp,
  });
  await emitAgentOperationalEvent({
    type: 'agent.failed',
    agentId: data.id,
    runId: input.runId,
    payload: {
      status: nextStatus,
      errorCode: String(input.errorCode || 'agent_execution_failed').slice(0, 160),
    },
  });
}

export function createAgentHeartbeatLease(input: {
  agentId: string;
  runId: string;
  expectedAuthorizationEpoch?: number;
  onError?: (error: unknown) => void;
}): { stop: () => void } {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      const accepted = await heartbeatAgentExecution({
        agentId: input.agentId,
        runId: input.runId,
        expectedAuthorizationEpoch: input.expectedAuthorizationEpoch,
      });
      if (!accepted) stopped = true;
    } catch (error) {
      input.onError?.(error);
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, AGENT_HEARTBEAT_INTERVAL_MS);
  timer.unref?.();

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
    },
  };
}
