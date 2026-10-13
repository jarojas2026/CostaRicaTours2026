import crypto from 'crypto';
import { getFirestoreDb } from './bookingService';
import {
  OWNER_APPROVAL_ACTIONS,
  type GovernanceActor,
  type OwnerApprovalAction,
  type OwnerApprovalRequest,
} from '../shared/ownerApprovalTypes';

const COLLECTION = 'agent_approvals';
const AUDIT_COLLECTION = 'agent_audit_log';

function cleanText(value: unknown, max: number, field: string): string {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${field} es obligatorio.`);
  return text.slice(0, max);
}

function normalizeMetadata(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
    const safeKey = String(key).slice(0, 80);
    if (raw === null || typeof raw === 'string' || typeof raw === 'boolean') {
      output[safeKey] = typeof raw === 'string' ? raw.slice(0, 1000) : raw;
    } else if (typeof raw === 'number' && Number.isFinite(raw)) {
      output[safeKey] = raw;
    }
  }
  return output;
}

function hashApprovalPayload(input: {
  action: OwnerApprovalAction;
  summary: string;
  resourceRef: string;
  metadata: Record<string, string | number | boolean | null>;
}): string {
  const orderedMetadata = Object.fromEntries(
    Object.entries(input.metadata).sort(([a], [b]) => a.localeCompare(b)),
  );
  return crypto.createHash('sha256')
    .update(JSON.stringify({
      action: input.action,
      summary: input.summary,
      resourceRef: input.resourceRef,
      metadata: orderedMetadata,
    }))
    .digest('hex');
}

function assertOwner(actor: GovernanceActor): void {
  if (!actor || actor.role !== 'owner') throw new Error('Se requiere autorización del owner.');
}

function cleanActor(actor: GovernanceActor): GovernanceActor {
  return {
    uid: actor?.uid ? String(actor.uid).slice(0, 160) : null,
    email: actor?.email ? String(actor.email).trim().toLowerCase().slice(0, 320) : null,
    role: actor?.role ? String(actor.role).slice(0, 80) : null,
  };
}

function assertApprovalAction(action: OwnerApprovalAction): void {
  if (!(OWNER_APPROVAL_ACTIONS as readonly string[]).includes(action)) {
    throw new Error('Tipo de aprobación no permitido.');
  }
}

export async function requestOwnerApproval(input: {
  action: OwnerApprovalAction;
  summary: string;
  resourceRef: string;
  requestedBy: GovernanceActor;
  metadata?: Record<string, unknown>;
}): Promise<OwnerApprovalRequest> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible: no se puede crear la aprobación.');
  assertApprovalAction(input.action);

  const now = new Date().toISOString();
  const metadata = normalizeMetadata(input.metadata);
  const summary = cleanText(input.summary, 2000, 'summary');
  const resourceRef = cleanText(input.resourceRef, 500, 'resourceRef');
  const payloadHash = hashApprovalPayload({
    action: input.action,
    summary,
    resourceRef,
    metadata,
  });
  const id = `approval_${crypto.randomUUID()}`;

  const approval: OwnerApprovalRequest = {
    id,
    action: input.action,
    status: 'pending',
    summary,
    resourceRef,
    payloadHash,
    metadata,
    requestedBy: cleanActor(input.requestedBy),
    createdAt: now,
    updatedAt: now,
    decidedAt: null,
    decidedBy: null,
    rejectionReason: null,
    consumedAt: null,
    consumedBy: null,
    version: 1,
  };

  await db.collection(COLLECTION).doc(id).create(approval);
  return approval;
}

export async function listOwnerApprovals(input: {
  status?: OwnerApprovalRequest['status'];
  limit?: number;
} = {}): Promise<OwnerApprovalRequest[]> {
  const db = getFirestoreDb();
  if (!db) return [];
  const safeLimit = Math.min(Math.max(Math.trunc(input.limit || 60), 1), 200);
  const snapshot = await db.collection(COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(input.status ? 200 : safeLimit)
    .get();
  const approvals = snapshot.docs.map((document) => document.data() as OwnerApprovalRequest);
  return (input.status ? approvals.filter((approval) => approval.status === input.status) : approvals)
    .slice(0, safeLimit);
}

async function decideOwnerApproval(input: {
  approvalId: string;
  decision: 'approved' | 'rejected';
  actor: GovernanceActor;
  reason?: string;
}): Promise<OwnerApprovalRequest> {
  assertOwner(input.actor);
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible.');
  const id = cleanText(input.approvalId, 160, 'approvalId');
  const ref = db.collection(COLLECTION).doc(id);
  const auditRef = db.collection(AUDIT_COLLECTION).doc(`audit_${crypto.randomUUID()}`);
  const now = new Date().toISOString();

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new Error('Solicitud de aprobación no encontrada.');
    const current = snapshot.data() as OwnerApprovalRequest;
    if (current.status !== 'pending') {
      throw new Error(`La aprobación ya fue resuelta con estado ${current.status}.`);
    }

    const next: OwnerApprovalRequest = {
      ...current,
      status: input.decision,
      updatedAt: now,
      decidedAt: now,
      decidedBy: cleanActor(input.actor),
      rejectionReason: input.decision === 'rejected'
        ? String(input.reason || 'Sin motivo indicado').slice(0, 1000)
        : null,
    };

    transaction.update(ref, {
      status: next.status,
      updatedAt: next.updatedAt,
      decidedAt: next.decidedAt,
      decidedBy: next.decidedBy,
      rejectionReason: next.rejectionReason,
    });
    transaction.create(auditRef, {
      id: auditRef.id,
      action: `approval.${input.decision}`,
      target: id,
      actor: cleanActor(input.actor),
      before: { status: current.status, action: current.action, resourceRef: current.resourceRef },
      after: { status: next.status, action: next.action, resourceRef: next.resourceRef },
      reason: next.rejectionReason,
      createdAt: now,
      immutable: true,
      version: 1,
    });
    return next;
  });
}

export const approveOwnerApproval = (approvalId: string, actor: GovernanceActor) =>
  decideOwnerApproval({ approvalId, decision: 'approved', actor });

export const rejectOwnerApproval = (approvalId: string, actor: GovernanceActor, reason?: string) =>
  decideOwnerApproval({ approvalId, decision: 'rejected', actor, reason });

export async function consumeOwnerApproval(input: {
  approvalId: string;
  action: OwnerApprovalAction;
  resourceRef: string;
  consumer: string;
}): Promise<OwnerApprovalRequest> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore no disponible.');
  const id = cleanText(input.approvalId, 160, 'approvalId');
  const resourceRef = cleanText(input.resourceRef, 500, 'resourceRef');
  const consumer = cleanText(input.consumer, 160, 'consumer');
  const ref = db.collection(COLLECTION).doc(id);
  const now = new Date().toISOString();

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new Error('Aprobación no encontrada.');
    const current = snapshot.data() as OwnerApprovalRequest;
    if (current.status !== 'approved') {
      throw new Error(`La acción requiere una aprobación vigente; estado actual: ${current.status}.`);
    }
    if (current.action !== input.action || current.resourceRef !== resourceRef) {
      throw new Error('La aprobación no corresponde a esta acción o recurso.');
    }

    const next: OwnerApprovalRequest = {
      ...current,
      status: 'consumed',
      updatedAt: now,
      consumedAt: now,
      consumedBy: consumer,
    };
    transaction.update(ref, {
      status: next.status,
      updatedAt: next.updatedAt,
      consumedAt: next.consumedAt,
      consumedBy: next.consumedBy,
    });
    return next;
  });
}
