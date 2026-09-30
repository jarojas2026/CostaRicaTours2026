import { createHash } from 'node:crypto';
import { getFirestoreDb } from './bookingService';
import { canPromoteTruth, type BusinessGoal, type Evidence } from './operationalTruthPolicy';

export type VerificationTaskStatus = 'pending' | 'in_progress' | 'verified' | 'failed' | 'human_review';

export type VerificationTask = {
  taskId: string;
  correlationId: string;
  journeyId?: string;
  sessionId: string;
  goal: BusinessGoal;
  requiredFacts: string[];
  requirements?: Record<string, unknown>;
  status: VerificationTaskStatus;
  nextAction: string;
  sourceChannel: string;
  createdAt: string;
  updatedAt: string;
  evidence?: Evidence[];
  observedFacts?: Record<string, unknown>;
  remainingFacts?: string[];
  attemptCount?: number;
  lastAttemptAt?: string;
  nextAttemptAfter?: string;
  failureReason?: string;
};

const clean = (value: unknown, max = 300) => String(value ?? '').trim().slice(0, max);

function normalizeFacts(facts: string[]) {
  return Array.from(new Set(facts.map(f => clean(f, 120)).filter(Boolean))).sort();
}

function firestoreSafeRequirements(requirements?: Record<string, unknown>) {
  if (!requirements) return undefined;
  return JSON.parse(JSON.stringify(requirements)) as Record<string, unknown>;
}

export function verificationTaskId(input: {
  correlationId: string;
  journeyId?: string;
  sessionId: string;
  goal: BusinessGoal;
  requiredFacts: string[];
}) {
  const facts = normalizeFacts(input.requiredFacts);
  const seed = [input.correlationId, input.journeyId || '', input.sessionId, input.goal, ...facts].join('|');
  return `verify_${createHash('sha256').update(seed).digest('hex').slice(0, 28)}`;
}

export async function createVerificationTask(input: {
  correlationId: string;
  journeyId?: string;
  sessionId: string;
  goal: BusinessGoal;
  requiredFacts: string[];
  requirements?: Record<string, unknown>;
  nextAction: string;
  sourceChannel: string;
}) {
  const requiredFacts = normalizeFacts(input.requiredFacts);
  const now = new Date().toISOString();
  const taskId = verificationTaskId({ ...input, requiredFacts });
  const task: VerificationTask = {
    taskId,
    correlationId: clean(input.correlationId, 160),
    journeyId: input.journeyId ? clean(input.journeyId, 160) : undefined,
    sessionId: clean(input.sessionId, 200),
    goal: input.goal,
    requiredFacts,
    requirements: firestoreSafeRequirements(input.requirements),
    status: 'pending',
    nextAction: clean(input.nextAction, 300),
    sourceChannel: clean(input.sourceChannel, 120),
    createdAt: now,
    updatedAt: now,
    observedFacts: {},
    remainingFacts: requiredFacts,
    attemptCount: 0
  };

  const db = getFirestoreDb();
  if (!db) return { persisted: false, task, created: true };
  const ref = db.collection('verification_tasks').doc(taskId);
  let created = false;
  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      tx.set(ref, { requirements: task.requirements, updatedAt: now, nextAction: task.nextAction }, { merge: true });
      return;
    }
    tx.create(ref, task);
    created = true;
  });
  const snap = await ref.get();
  return { persisted: true, task: snap.exists ? ({ taskId, ...(snap.data() || {}) } as VerificationTask) : task, created };
}

export async function getVerificationTask(taskId: string) {
  const db = getFirestoreDb();
  if (!db) return null;
  const snap = await db.collection('verification_tasks').doc(clean(taskId, 180)).get();
  return snap.exists ? ({ taskId: snap.id, ...(snap.data() || {}) } as VerificationTask) : null;
}

export async function markVerificationTaskInProgress(taskId: string) {
  const db = getFirestoreDb();
  const now = new Date().toISOString();
  if (!db) return { persisted: false, taskId, status: 'in_progress' as const };
  const ref = db.collection('verification_tasks').doc(clean(taskId, 180));
  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const attempts = Number(snap.data()?.attemptCount || 0) + 1;
    tx.set(ref, { status: 'in_progress', attemptCount: attempts, lastAttemptAt: now, startedAt: now, updatedAt: now }, { merge: true });
  });
  return { persisted: true, taskId, status: 'in_progress' as const };
}

export async function recordVerificationObservation(input: {
  taskId: string;
  evidence: Evidence;
  facts: Record<string, unknown>;
  retryAfterMs?: number;
}) {
  const db = getFirestoreDb();
  if (!db) return { persisted: false, taskId: input.taskId, status: 'pending' as const };
  const ref = db.collection('verification_tasks').doc(clean(input.taskId, 180));
  let result: any = null;
  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('verification_task_not_found');
    const task = snap.data() as VerificationTask;
    const observedFacts = { ...(task.observedFacts || {}), ...(input.facts || {}) };
    const remainingFacts = normalizeFacts((task.requiredFacts || []).filter(key => observedFacts[key] === undefined || observedFacts[key] === null || observedFacts[key] === ''));
    const evidence = [...(task.evidence || []), input.evidence].slice(-20);
    const complete = remainingFacts.length === 0;
    const now = new Date().toISOString();
    const patch = {
      observedFacts,
      remainingFacts,
      evidence,
      status: complete ? 'verified' : 'pending',
      verifiedAt: complete ? now : undefined,
      nextAttemptAfter: complete ? null : new Date(Date.now() + Math.max(15_000, input.retryAfterMs || 5 * 60_000)).toISOString(),
      updatedAt: now
    };
    tx.set(ref, patch, { merge: true });
    result = { taskId: input.taskId, ...patch };
  });
  return { persisted: true, ...result };
}

export async function completeVerificationTask(input: {
  taskId: string;
  evidence: Evidence[];
  verifiedFacts: string[];
}) {
  const evidence = input.evidence || [];
  const verifiedFacts = normalizeFacts(input.verifiedFacts || []);
  const hasLiveEvidence = evidence.some(item => canPromoteTruth({ from: 'PROVIDER_PROVIDED', to: 'LIVE_VERIFIED', evidence: item }));
  if (!hasLiveEvidence) throw new Error('verification_task_requires_fresh_authoritative_evidence');

  const db = getFirestoreDb();
  const patch = {
    status: 'verified' as const,
    evidence,
    verifiedFacts,
    remainingFacts: [],
    verifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (!db) return { persisted: false, taskId: input.taskId, ...patch };
  const ref = db.collection('verification_tasks').doc(clean(input.taskId, 180));
  await ref.set(patch, { merge: true });
  return { persisted: true, taskId: input.taskId, ...patch };
}

export async function deferVerificationTask(taskId: string, reason: string, retryAfterMs = 5 * 60_000) {
  const db = getFirestoreDb();
  const patch = {
    status: 'pending' as const,
    failureReason: clean(reason, 1000),
    nextAttemptAfter: new Date(Date.now() + Math.max(15_000, retryAfterMs)).toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (!db) return { persisted: false, taskId, ...patch };
  await db.collection('verification_tasks').doc(clean(taskId, 180)).set(patch, { merge: true });
  return { persisted: true, taskId, ...patch };
}

export async function failVerificationTask(taskId: string, reason: string, humanReview = false) {
  const db = getFirestoreDb();
  const patch = {
    status: (humanReview ? 'human_review' : 'failed') as VerificationTaskStatus,
    failureReason: clean(reason, 1000),
    updatedAt: new Date().toISOString()
  };
  if (!db) return { persisted: false, taskId, ...patch };
  const ref = db.collection('verification_tasks').doc(clean(taskId, 180));
  await ref.set(patch, { merge: true });
  return { persisted: true, taskId, ...patch };
}
