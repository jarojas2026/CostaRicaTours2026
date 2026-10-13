import crypto from 'crypto';
import { getFirestoreDb } from './bookingService';
import type {
  AgentRunActor,
  AgentRunCost,
  AgentRunError,
  AgentRunRecord,
  AgentRunStatus,
  AgentRunStepRecord,
  AgentRunStepResult,
  AgentRunStepStatus,
  AgentRunStepTool,
} from '../shared/agentOfficeTypes';

const RUNS_COLLECTION = 'agentRuns';

const TERMINAL_RUN_STATUSES = new Set<AgentRunStatus>(['completed', 'failed', 'cancelled', 'revoked']);
const ALLOWED_TRANSITIONS: Readonly<Record<AgentRunStatus, readonly AgentRunStatus[]>> = {
  queued: ['running', 'cancelled', 'revoked'],
  running: ['waiting_approval', 'completed', 'failed', 'cancelled', 'revoked'],
  waiting_approval: ['running', 'failed', 'cancelled', 'revoked'],
  completed: [],
  failed: [],
  cancelled: [],
  revoked: [],
};

function cleanText(value: unknown, max: number, field: string): string {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${field} es obligatorio.`);
  return text.slice(0, max);
}

function cleanActor(actor: AgentRunActor): AgentRunActor {
  return {
    kind: actor.kind,
    id: cleanText(actor.id, 160, 'requestedBy.id'),
    email: actor.email ? String(actor.email).trim().slice(0, 320) : null,
  };
}

export function zeroRunCost(): AgentRunCost {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostUSD: 0,
    billedCostUSD: null,
  };
}

export function buildAgentRun(input: {
  requestedBy: AgentRunActor;
  objective: string;
  agentId: string;
  now?: Date;
  id?: string;
}): AgentRunRecord {
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();
  return {
    id: input.id || `run_${crypto.randomUUID()}`,
    requestedBy: cleanActor(input.requestedBy),
    objective: cleanText(input.objective, 8000, 'objective'),
    agentId: cleanText(input.agentId, 160, 'agentId'),
    status: 'queued',
    createdAt: timestamp,
    updatedAt: timestamp,
    startedAt: null,
    completedAt: null,
    durationMs: null,
    cost: null,
    error: null,
    lastStepSequence: 0,
    version: 1,
  };
}

export function buildAgentRunStep(input: {
  runId: string;
  agentId: string;
  sequence: number;
  status: AgentRunStepStatus;
  decisionSummary: string;
  tool?: AgentRunStepTool | null;
  result?: AgentRunStepResult | null;
  error?: AgentRunError | null;
  durationMs?: number | null;
  cost?: AgentRunCost | null;
  now?: Date;
  id?: string;
}): AgentRunStepRecord {
  if (!Number.isSafeInteger(input.sequence) || input.sequence < 1) {
    throw new Error('sequence debe ser un entero positivo.');
  }
  const durationMs = input.durationMs ?? null;
  if (durationMs !== null && (!Number.isFinite(durationMs) || durationMs < 0)) {
    throw new Error('durationMs no puede ser negativo.');
  }
  return {
    id: input.id || `step_${String(input.sequence).padStart(6, '0')}_${crypto.randomUUID()}`,
    runId: cleanText(input.runId, 180, 'runId'),
    sequence: input.sequence,
    agentId: cleanText(input.agentId, 160, 'agentId'),
    status: input.status,
    // Auditable summary only. Never store private chain-of-thought.
    decisionSummary: cleanText(input.decisionSummary, 4000, 'decisionSummary'),
    tool: input.tool ?? null,
    result: input.result ?? null,
    error: input.error ?? null,
    durationMs,
    cost: input.cost ?? null,
    createdAt: (input.now ?? new Date()).toISOString(),
  };
}

export function assertAgentRunTransition(from: AgentRunStatus, to: AgentRunStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transición de agentRun no permitida: ${from} -> ${to}`);
  }
}

export async function createAgentRun(input: {
  requestedBy: AgentRunActor;
  objective: string;
  agentId: string;
}): Promise<AgentRunRecord> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible: no se puede crear agentRun.');

  const run = buildAgentRun(input);
  const agentRef = db.collection('agents').doc(run.agentId);
  const agentSnapshot = await agentRef.get();
  if (!agentSnapshot.exists) {
    throw new Error(`Agente no registrado: ${run.agentId}`);
  }

  await db.collection(RUNS_COLLECTION).doc(run.id).create(run);
  return run;
}

export async function appendAgentRunStep(input: {
  runId: string;
  agentId: string;
  sequence: number;
  status: AgentRunStepStatus;
  decisionSummary: string;
  tool?: AgentRunStepTool | null;
  result?: AgentRunStepResult | null;
  error?: AgentRunError | null;
  durationMs?: number | null;
  cost?: AgentRunCost | null;
}): Promise<AgentRunStepRecord> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible: no se puede registrar el step.');

  const step = buildAgentRunStep(input);
  const runRef = db.collection(RUNS_COLLECTION).doc(step.runId);
  const stepRef = runRef.collection('steps').doc(step.id);

  await db.runTransaction(async (transaction) => {
    const runSnapshot = await transaction.get(runRef);
    if (!runSnapshot.exists) throw new Error(`agentRun no encontrado: ${step.runId}`);

    const run = runSnapshot.data() as AgentRunRecord;
    if (TERMINAL_RUN_STATUSES.has(run.status)) {
      throw new Error(`agentRun ${step.runId} ya terminó con estado ${run.status}.`);
    }
    if (run.agentId !== step.agentId) {
      throw new Error('El step no pertenece al agente asignado al agentRun.');
    }

    const expectedSequence = Number(run.lastStepSequence || 0) + 1;
    if (step.sequence !== expectedSequence) {
      throw new Error(`Secuencia inválida: se esperaba ${expectedSequence} y se recibió ${step.sequence}.`);
    }

    transaction.create(stepRef, step);
    transaction.update(runRef, {
      lastStepSequence: step.sequence,
      updatedAt: step.createdAt,
    });
  });

  return step;
}

export async function transitionAgentRun(input: {
  runId: string;
  to: AgentRunStatus;
  error?: AgentRunError | null;
  cost?: AgentRunCost | null;
  now?: Date;
}): Promise<AgentRunRecord> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible: no se puede actualizar agentRun.');

  const runId = cleanText(input.runId, 180, 'runId');
  const runRef = db.collection(RUNS_COLLECTION).doc(runId);
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(runRef);
    if (!snapshot.exists) throw new Error(`agentRun no encontrado: ${runId}`);

    const current = snapshot.data() as AgentRunRecord;
    assertAgentRunTransition(current.status, input.to);

    const startedAt = input.to === 'running' && !current.startedAt ? timestamp : current.startedAt;
    const completedAt = TERMINAL_RUN_STATUSES.has(input.to) ? timestamp : current.completedAt;
    const basis = startedAt ? Date.parse(startedAt) : Date.parse(current.createdAt);
    const durationMs = completedAt && Number.isFinite(basis)
      ? Math.max(0, Date.parse(completedAt) - basis)
      : current.durationMs;

    const next: AgentRunRecord = {
      ...current,
      status: input.to,
      updatedAt: timestamp,
      startedAt,
      completedAt,
      durationMs,
      error: input.error === undefined ? current.error : input.error,
      cost: input.cost === undefined ? current.cost : input.cost,
    };

    transaction.update(runRef, {
      status: next.status,
      updatedAt: next.updatedAt,
      startedAt: next.startedAt,
      completedAt: next.completedAt,
      durationMs: next.durationMs,
      error: next.error,
      cost: next.cost,
    });
    return next;
  });
}

export async function getAgentRun(runId: string): Promise<AgentRunRecord | null> {
  const id = String(runId || '').trim();
  if (!id) return null;
  const db = getFirestoreDb();
  if (!db) return null;
  const snapshot = await db.collection(RUNS_COLLECTION).doc(id).get();
  return snapshot.exists ? snapshot.data() as AgentRunRecord : null;
}

export async function listAgentRunSteps(runId: string, limit = 200): Promise<AgentRunStepRecord[]> {
  const id = String(runId || '').trim();
  if (!id) return [];
  const db = getFirestoreDb();
  if (!db) return [];
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 200, 1), 500);
  const snapshot = await db.collection(RUNS_COLLECTION).doc(id).collection('steps')
    .orderBy('sequence', 'asc')
    .limit(safeLimit)
    .get();
  return snapshot.docs.map((doc) => doc.data() as AgentRunStepRecord);
}
