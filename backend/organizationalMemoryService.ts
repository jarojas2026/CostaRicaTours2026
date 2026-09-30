import { createHash, randomUUID } from 'node:crypto';
import { getFirestoreDb } from './bookingService';

export type TruthState = 'CUSTOMER_PROVIDED' | 'PROVIDER_PROVIDED' | 'LIVE_VERIFIED' | 'AUTHORITATIVE_CATALOG' | 'UNVERIFIED';
export type OrganizationalFact = {
  key: string;
  value: unknown;
  truth: TruthState;
  sourceChannel: string;
  sourceMessageId?: string;
  observedAt?: string;
  verifiedAt?: string;
  expiresAt?: string;
};

export type OrganizationalFlowEvent = {
  journeyId?: string;
  sessionId?: string;
  correlationId?: string;
  channel: string;
  externalMessageId?: string;
  externalThreadId?: string;
  direction: 'inbound' | 'outbound' | 'internal';
  actor: 'customer' | 'provider' | 'agent' | 'system' | 'human';
  intent?: string;
  status?: string;
  confirmedFacts?: OrganizationalFact[];
  verifiedFacts?: OrganizationalFact[];
  pendingFacts?: OrganizationalFact[];
  actionsExecuted?: string[];
  providerRequests?: string[];
  nextAction?: string;
  metadata?: Record<string, unknown>;
};

const clean = (value: unknown, max = 500) => String(value ?? '').trim().slice(0, max);

function stableId(input: OrganizationalFlowEvent) {
  const source = [input.channel, input.externalMessageId, input.direction, input.actor, input.intent].map(v => clean(v, 300)).join('|');
  if (input.externalMessageId) return createHash('sha256').update(source).digest('hex').slice(0, 40);
  return randomUUID().replace(/-/g, '');
}

export function createCorrelationId(seed?: string) {
  if (seed) return `corr_${createHash('sha256').update(seed).digest('hex').slice(0, 24)}`;
  return `corr_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

export async function rememberOrganizationalFlow(input: OrganizationalFlowEvent) {
  const db = getFirestoreDb();
  const now = new Date().toISOString();
  const correlationId = clean(input.correlationId, 120) || createCorrelationId(input.externalMessageId || input.sessionId);
  const id = stableId(input);
  const record = JSON.parse(JSON.stringify({
    ...input,
    id,
    correlationId,
    journeyId: input.journeyId ? clean(input.journeyId, 160) : null,
    sessionId: input.sessionId ? clean(input.sessionId, 200) : null,
    externalMessageId: input.externalMessageId ? clean(input.externalMessageId, 300) : null,
    externalThreadId: input.externalThreadId ? clean(input.externalThreadId, 300) : null,
    createdAt: now,
    updatedAt: now
  }));
  if (!db) return { persisted: false, ...record };
  await db.collection('organizational_flow_events').doc(id).set(record, { merge: true });
  if (record.externalThreadId) {
    const threadKey = createHash('sha256').update(`${record.channel}|${record.externalThreadId}`).digest('hex').slice(0, 40);
    await db.collection('communication_thread_links').doc(threadKey).set({
      id: threadKey,
      channel: record.channel,
      externalThreadId: record.externalThreadId,
      journeyId: record.journeyId,
      sessionId: record.sessionId,
      correlationId,
      lastEventId: id,
      updatedAt: now
    }, { merge: true });
  }
  return { persisted: true, ...record };
}

export async function resolveOrganizationalThread(channel: string, externalThreadId: string) {
  const db = getFirestoreDb();
  if (!db || !externalThreadId) return null;
  const threadKey = createHash('sha256').update(`${clean(channel, 100)}|${clean(externalThreadId, 300)}`).digest('hex').slice(0, 40);
  const snap = await db.collection('communication_thread_links').doc(threadKey).get();
  return snap.exists ? snap.data() : null;
}
