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
    updatedAt: now
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
  if (!db) return { persisted: false, taskId, status: 'in_progress' as const };
  const ref = db.collection('verification_tasks').doc(clean(taskId, 180));
  await ref.set({ status: 'in_progress', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
  return { persisted: true, taskId, status: 'in_progress' as const };
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
    verifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (!db) return { persisted: false, taskId: input.taskId, ...patch };
  const ref = db.collection('verification_tasks').doc(clean(input.taskId, 180));
  await ref.set(patch, { merge: true });
  return { persisted: true, taskId: input.taskId, ...patch };
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
