import { createHash } from 'node:crypto';
import { createCorrelationId, rememberOrganizationalFlow, resolveOrganizationalThread, type OrganizationalFact } from './organizationalMemoryService';

export type OmnichannelInbound = {
  channel: 'email:gmail' | 'email:outlook' | 'web' | 'whatsapp' | 'voice' | 'provider_portal' | string;
  messageId: string;
  threadId?: string;
  sessionId?: string;
  journeyId?: string;
  actor: 'customer' | 'provider';
  intent?: string;
  requirements?: Record<string, unknown>;
};

const clean = (value: unknown, max = 300) => String(value ?? '').trim().slice(0, max);
const hasValue = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== '';

export function stableOmnichannelSession(input: Pick<OmnichannelInbound, 'channel' | 'threadId' | 'messageId' | 'sessionId'>) {
  if (input.sessionId) return clean(input.sessionId, 200);
  const continuityKey = input.threadId || input.messageId;
  const digest = createHash('sha256').update(`${clean(input.channel, 80)}|${clean(continuityKey, 300)}`).digest('hex').slice(0, 28);
  return `journey_channel_${digest}`;
}

export function requirementsToFacts(input: OmnichannelInbound): OrganizationalFact[] {
  return Object.entries(input.requirements || {})
    .filter(([, value]) => hasValue(value))
    .map(([key, value]) => ({
      key: clean(key, 120),
      value,
      truth: input.actor === 'provider' ? 'PROVIDER_PROVIDED' as const : 'CUSTOMER_PROVIDED' as const,
      sourceChannel: input.channel,
      sourceMessageId: input.messageId,
      observedAt: new Date().toISOString()
    }));
}

export async function openOrResumeOmnichannelJourney(input: OmnichannelInbound) {
  const existing = input.threadId ? await resolveOrganizationalThread(input.channel, input.threadId) : null;
  const sessionId = clean(existing?.sessionId, 200) || stableOmnichannelSession(input);
  const journeyId = clean(existing?.journeyId, 160) || clean(input.journeyId, 160) || undefined;
  const correlationId = clean(existing?.correlationId, 120) || createCorrelationId(`${input.channel}:${input.threadId || input.messageId}`);
  const confirmedFacts = requirementsToFacts(input);

  const memory = await rememberOrganizationalFlow({
    journeyId,
    sessionId,
    correlationId,
    channel: input.channel,
    externalMessageId: input.messageId,
    externalThreadId: input.threadId,
    direction: 'inbound',
    actor: input.actor,
    intent: clean(input.intent, 120) || 'general_inquiry',
    status: 'received',
    confirmedFacts,
    actionsExecuted: ['resolve_thread_continuity', 'persist_confirmed_requirements'],
    nextAction: input.actor === 'provider' ? 'reconcile_provider_evidence' : 'triage_and_verify_requirements',
    metadata: { resumedExistingThread: Boolean(existing) }
  });

  return { sessionId, journeyId, correlationId, confirmedFacts, resumedExistingThread: Boolean(existing), memory };
}

export async function recordVerificationPending(input: {
  channel: string;
  messageId: string;
  threadId?: string;
  sessionId?: string;
  journeyId?: string;
  correlationId?: string;
  keys: string[];
  nextAction: string;
}) {
  const pendingFacts: OrganizationalFact[] = input.keys.map(key => ({
    key: clean(key, 120),
    value: null,
    truth: 'UNVERIFIED',
    sourceChannel: input.channel,
    sourceMessageId: input.messageId,
    observedAt: new Date().toISOString()
  }));
  return rememberOrganizationalFlow({
    journeyId: input.journeyId,
    sessionId: input.sessionId,
    correlationId: input.correlationId,
    channel: input.channel,
    externalMessageId: `${input.messageId}:verification`,
    externalThreadId: input.threadId,
    direction: 'internal',
    actor: 'agent',
    intent: 'verification_required',
    status: 'pending_verification',
    pendingFacts,
    actionsExecuted: ['separate_unverified_operational_facts'],
    nextAction: clean(input.nextAction, 240)
  });
}
