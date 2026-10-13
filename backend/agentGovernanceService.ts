import crypto from 'crypto';
import { getFirestoreDb } from './bookingService';
import { abortAgentExecutions, abortAllAgentExecutions } from './agentCancellationRegistry';
import { emitAgentOperationalEvent } from './operationalEventBus';
import type {
  AgentAutonomyLevel,
  AgentRecord,
  AgentStatus,
} from '../shared/agentOfficeTypes';
import type { GovernanceActor } from '../shared/ownerApprovalTypes';

const GLOBAL_COLLECTION = 'agent_governance';
const GLOBAL_DOC = 'global';
const AUDIT_COLLECTION = 'agent_audit_log';

export type GlobalAgentControl = {
  agentsDisabled: boolean;
  reason: string | null;
  updatedAt: string | null;
  updatedBy: GovernanceActor | null;
  version: 1;
};

export type AgentExecutionAuthorization = {
  allowed: boolean;
  reason: 'authorized' | 'firestore_unavailable' | 'agent_not_found' | 'global_shutdown' | 'paused' | 'revoked' | 'authorization_epoch_mismatch';
  agent: AgentRecord | null;
  authorizationEpoch: number | null;
  autonomyLevel: AgentAutonomyLevel | null;
};

function assertOwner(actor: GovernanceActor): void {
  if (!actor || actor.role !== 'owner') {
    throw new Error('Se requiere autorización del owner.');
  }
}

function cleanAgentId(value: unknown): string {
  const id = String(value ?? '').trim();
  if (!id || id.length > 128 || !/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error('agentId no válido.');
  }
  return id;
}

function cleanReason(value: unknown): string | null {
  const reason = String(value ?? '').trim();
  return reason ? reason.slice(0, 1000) : null;
}

function nextEpoch(agent: Partial<AgentRecord>): number {
  const current = Number(agent.authorizationEpoch);
  return Number.isSafeInteger(current) && current >= 1 ? current + 1 : 2;
}

function auditRecord(input: {
  action: string;
  target: string;
  actor: GovernanceActor;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason?: string | null;
  now: string;
}) {
  return {
    id: `audit_${crypto.randomUUID()}`,
    action: input.action.slice(0, 120),
    target: input.target.slice(0, 180),
    actor: input.actor,
    before: input.before,
    after: input.after,
    reason: cleanReason(input.reason),
    createdAt: input.now,
    immutable: true,
    version: 1,
  };
}

export async function getGlobalAgentControl(): Promise<GlobalAgentControl> {
  const db = getFirestoreDb();
  if (!db) {
    return {
      agentsDisabled: true,
      reason: 'firestore_unavailable',
      updatedAt: null,
      updatedBy: null,
      version: 1,
    };
  }
  const snapshot = await db.collection(GLOBAL_COLLECTION).doc(GLOBAL_DOC).get();
  if (!snapshot.exists) {
    return {
      agentsDisabled: false,
      reason: null,
      updatedAt: null,
      updatedBy: null,
      version: 1,
    };
  }
  const data = snapshot.data() || {};
  return {
    agentsDisabled: data.agentsDisabled === true,
    reason: typeof data.reason === 'string' ? data.reason : null,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
    updatedBy: data.updatedBy || null,
    version: 1,
  };
}

export async function getAgentExecutionAuthorization(
  agentId: string,
  expectedAuthorizationEpoch?: number,
): Promise<AgentExecutionAuthorization> {
  const id = cleanAgentId(agentId);
  const db = getFirestoreDb();
  if (!db) {
    return {
      allowed: false,
      reason: 'firestore_unavailable',
      agent: null,
      authorizationEpoch: null,
      autonomyLevel: null,
    };
  }

  const [globalSnapshot, agentSnapshot] = await Promise.all([
    db.collection(GLOBAL_COLLECTION).doc(GLOBAL_DOC).get(),
    db.collection('agents').doc(id).get(),
  ]);

  if (globalSnapshot.exists && globalSnapshot.data()?.agentsDisabled === true) {
    return {
      allowed: false,
      reason: 'global_shutdown',
      agent: agentSnapshot.exists ? agentSnapshot.data() as AgentRecord : null,
      authorizationEpoch: agentSnapshot.exists ? Number(agentSnapshot.data()?.authorizationEpoch || 1) : null,
      autonomyLevel: agentSnapshot.exists ? Number(agentSnapshot.data()?.autonomyLevel || 0) as AgentAutonomyLevel : null,
    };
  }

  if (!agentSnapshot.exists) {
    return {
      allowed: false,
      reason: 'agent_not_found',
      agent: null,
      authorizationEpoch: null,
      autonomyLevel: null,
    };
  }

  const agent = agentSnapshot.data() as AgentRecord;
  const epoch = Number.isSafeInteger(Number(agent.authorizationEpoch))
    ? Number(agent.authorizationEpoch)
    : 1;

  if (agent.status === 'paused') {
    return { allowed: false, reason: 'paused', agent, authorizationEpoch: epoch, autonomyLevel: agent.autonomyLevel };
  }
  if (agent.status === 'revoked') {
    return { allowed: false, reason: 'revoked', agent, authorizationEpoch: epoch, autonomyLevel: agent.autonomyLevel };
  }
  if (expectedAuthorizationEpoch !== undefined && expectedAuthorizationEpoch !== epoch) {
    return {
      allowed: false,
      reason: 'authorization_epoch_mismatch',
      agent,
      authorizationEpoch: epoch,
      autonomyLevel: agent.autonomyLevel,
    };
  }

  return {
    allowed: true,
    reason: 'authorized',
    agent,
    authorizationEpoch: epoch,
    autonomyLevel: agent.autonomyLevel,
  };
}

export async function assertAgentExecutionAuthorized(
  agentId: string,
  expectedAuthorizationEpoch?: number,
): Promise<AgentExecutionAuthorization> {
  const decision = await getAgentExecutionAuthorization(agentId, expectedAuthorizationEpoch);
  if (!decision.allowed) {
    throw new Error(`Ejecución de agente bloqueada por gobernanza: ${decision.reason}`);
  }
  return decision;
}

export async function setAgentAutonomy(input: {
  agentId: string;
  level: AgentAutonomyLevel;
  actor: GovernanceActor;
  reason?: string;
}): Promise<AgentRecord> {
  assertOwner(input.actor);
  if (![0, 1, 2, 3].includes(input.level)) throw new Error('Nivel de autonomía inválido.');
  const id = cleanAgentId(input.agentId);
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible.');
  const ref = db.collection('agents').doc(id);
  const now = new Date().toISOString();
  const auditRef = db.collection(AUDIT_COLLECTION).doc(`audit_${crypto.randomUUID()}`);

  const next = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new Error(`Agente no registrado: ${id}`);
    const current = snapshot.data() as AgentRecord;
    if (current.status === 'revoked') throw new Error('Un agente revocado debe restaurarse antes de cambiar su autonomía.');

    const updated: AgentRecord = {
      ...current,
      autonomyLevel: input.level,
      authorizationEpoch: nextEpoch(current),
      governanceUpdatedAt: now,
      updatedAt: now,
    };
    transaction.update(ref, {
      autonomyLevel: updated.autonomyLevel,
      authorizationEpoch: updated.authorizationEpoch,
      governanceUpdatedAt: now,
      updatedAt: now,
    });
    const audit = auditRecord({
      action: 'agent.autonomy_changed',
      target: id,
      actor: input.actor,
      before: { autonomyLevel: current.autonomyLevel, authorizationEpoch: current.authorizationEpoch },
      after: { autonomyLevel: updated.autonomyLevel, authorizationEpoch: updated.authorizationEpoch },
      reason: input.reason,
      now,
    });
    transaction.create(auditRef, audit);
    return updated;
  });

  abortAgentExecutions(id, 'agent_autonomy_changed');
  return next;
}

async function setAgentControlState(input: {
  agentId: string;
  action: 'pause' | 'resume' | 'revoke' | 'restore';
  actor: GovernanceActor;
  reason?: string;
}): Promise<AgentRecord> {
  assertOwner(input.actor);
  const id = cleanAgentId(input.agentId);
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible.');
  const ref = db.collection('agents').doc(id);
  const now = new Date().toISOString();
  const auditRef = db.collection(AUDIT_COLLECTION).doc(`audit_${crypto.randomUUID()}`);

  const next = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new Error(`Agente no registrado: ${id}`);
    const current = snapshot.data() as AgentRecord;

    let status: AgentStatus;
    let autonomyLevel = current.autonomyLevel;
    let currentTask = current.currentTask;
    let governanceControl = current.governanceControl ?? null;

    if (input.action === 'pause') {
      if (current.status === 'revoked') throw new Error('Un agente revocado no puede pausarse.');
      status = 'paused';
      governanceControl = { source: 'owner', reason: cleanReason(input.reason) };
    } else if (input.action === 'resume') {
      if (current.status !== 'paused') throw new Error('Solo un agente pausado puede reanudarse.');
      status = 'no_signal';
      currentTask = null;
      governanceControl = null;
    } else if (input.action === 'revoke') {
      status = 'revoked';
      autonomyLevel = 0;
      currentTask = null;
      governanceControl = { source: 'owner', reason: cleanReason(input.reason) };
    } else {
      if (current.status !== 'revoked') throw new Error('Solo un agente revocado puede restaurarse.');
      status = 'no_signal';
      autonomyLevel = 0;
      currentTask = null;
      governanceControl = null;
    }

    const updated: AgentRecord = {
      ...current,
      status,
      autonomyLevel,
      currentTask,
      governanceControl,
      authorizationEpoch: nextEpoch(current),
      governanceUpdatedAt: now,
      updatedAt: now,
    };

    transaction.update(ref, {
      status: updated.status,
      autonomyLevel: updated.autonomyLevel,
      currentTask: updated.currentTask,
      governanceControl: updated.governanceControl,
      authorizationEpoch: updated.authorizationEpoch,
      governanceUpdatedAt: updated.governanceUpdatedAt,
      updatedAt: updated.updatedAt,
    });
    transaction.create(auditRef, auditRecord({
      action: `agent.${input.action}`,
      target: id,
      actor: input.actor,
      before: {
        status: current.status,
        autonomyLevel: current.autonomyLevel,
        authorizationEpoch: current.authorizationEpoch,
      },
      after: {
        status: updated.status,
        autonomyLevel: updated.autonomyLevel,
        authorizationEpoch: updated.authorizationEpoch,
      },
      reason: input.reason,
      now,
    }));
    return updated;
  });

  if (input.action === 'pause' || input.action === 'revoke') {
    abortAgentExecutions(id, `agent_${input.action}`);
  }

  if (input.action === 'pause') {
    await emitAgentOperationalEvent({
      type: 'agent.paused',
      agentId: id,
      runId: next.currentTask?.runId || null,
      payload: { status: next.status },
    });
  } else if (input.action === 'revoke') {
    await emitAgentOperationalEvent({
      type: 'agent.revoked',
      agentId: id,
      payload: { status: next.status, authorizationEpoch: next.authorizationEpoch },
    });
  }

  return next;
}

export const pauseAgent = (input: { agentId: string; actor: GovernanceActor; reason?: string }) =>
  setAgentControlState({ ...input, action: 'pause' });

export const resumeAgent = (input: { agentId: string; actor: GovernanceActor; reason?: string }) =>
  setAgentControlState({ ...input, action: 'resume' });

export const revokeAgent = (input: { agentId: string; actor: GovernanceActor; reason?: string }) =>
  setAgentControlState({ ...input, action: 'revoke' });

export const restoreAgent = (input: { agentId: string; actor: GovernanceActor; reason?: string }) =>
  setAgentControlState({ ...input, action: 'restore' });

export async function setGlobalAgentShutdown(input: {
  disabled: boolean;
  actor: GovernanceActor;
  reason?: string;
}): Promise<GlobalAgentControl> {
  assertOwner(input.actor);
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible.');
  const now = new Date().toISOString();
  const reason = cleanReason(input.reason);
  const control: GlobalAgentControl = {
    agentsDisabled: input.disabled,
    reason,
    updatedAt: now,
    updatedBy: input.actor,
    version: 1,
  };

  const snapshot = await db.collection('agents').get();
  const batch = db.batch();
  const globalRef = db.collection(GLOBAL_COLLECTION).doc(GLOBAL_DOC);
  batch.set(globalRef, control, { merge: true });

  for (const document of snapshot.docs) {
    const agent = document.data() as AgentRecord;
    if (input.disabled) {
      if (agent.status === 'revoked') continue;
      batch.update(document.ref, {
        status: 'paused',
        governanceControl: { source: 'global', reason },
        authorizationEpoch: nextEpoch(agent),
        governanceUpdatedAt: now,
        updatedAt: now,
      });
    } else if (agent.status === 'paused' && agent.governanceControl?.source === 'global') {
      batch.update(document.ref, {
        status: 'no_signal',
        currentTask: null,
        governanceControl: null,
        authorizationEpoch: nextEpoch(agent),
        governanceUpdatedAt: now,
        updatedAt: now,
      });
    }
  }

  const auditRef = db.collection(AUDIT_COLLECTION).doc(`audit_${crypto.randomUUID()}`);
  batch.create(auditRef, auditRecord({
    action: input.disabled ? 'agents.global_shutdown' : 'agents.global_resume',
    target: 'all_agents',
    actor: input.actor,
    before: null,
    after: { agentsDisabled: input.disabled },
    reason,
    now,
  }));
  await batch.commit();

  if (input.disabled) abortAllAgentExecutions('global_agent_shutdown');
  return control;
}

export async function listAgentGovernanceAudit(limit = 100) {
  const db = getFirestoreDb();
  if (!db) return [];
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 100, 1), 250);
  const snapshot = await db.collection(AUDIT_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(safeLimit)
    .get();
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
}
