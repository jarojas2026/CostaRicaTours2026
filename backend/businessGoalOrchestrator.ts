import { emitOperationalEvent } from './operationalEventBus';
import { openOrResumeOmnichannelJourney, recordVerificationPending } from './omnichannelJourneyBridge';
import { inferBusinessGoal, requiredOperationalFacts, type BusinessGoal } from './operationalTruthPolicy';
import { rememberOrganizationalFlow } from './organizationalMemoryService';
import { createVerificationTask } from './verificationTaskService';
import { attemptVerificationTask } from './verificationTaskWorker';

export type ExecuteBusinessGoalInput = {
  channel: string;
  messageId: string;
  threadId?: string;
  sessionId?: string;
  journeyId?: string;
  actor: 'customer' | 'provider';
  intent?: string;
  message?: string;
  requirements?: Record<string, unknown>;
  requestedGoal?: BusinessGoal;
};

export type BusinessGoalExecution = {
  correlationId: string;
  journeyId?: string;
  sessionId: string;
  goal: BusinessGoal;
  confirmedFacts: unknown[];
  verifiedFacts: unknown[];
  pendingFacts: string[];
  actionsExecuted: string[];
  verificationTaskIds: string[];
  providerRequests: string[];
  verificationExecution?: unknown;
  nextAction: string;
  customerCommunicationState: 'not_required' | 'ready_for_acknowledgement' | 'awaiting_verification' | 'human_review';
};

const clean = (value: unknown, max = 300) => String(value ?? '').trim().slice(0, max);

function nextActionFor(goal: BusinessGoal, actor: 'customer' | 'provider', pendingFacts: string[]) {
  if (actor === 'provider') return 'reconcile_provider_evidence_with_existing_service_order';
  if (!pendingFacts.length) return 'continue_domain_workflow';
  if (goal === 'lodging_quote') return 'search_and_verify_lodging_inventory_or_contact_verified_lodging_providers';
  if (goal === 'tour_quote') return 'verify_tour_inventory_price_schedule_and_provider';
  if (goal === 'transport_quote') return 'verify_transport_inventory_vehicle_price_and_provider';
  if (goal === 'itinerary_quote') return 'verify_each_itinerary_component_before_quote';
  if (goal === 'reservation') return 'verify_inventory_and_server_authoritative_price_before_booking';
  return 'answer_from_stable_knowledge_or_request_missing_information';
}

export async function executeBusinessGoal(input: ExecuteBusinessGoalInput): Promise<BusinessGoalExecution> {
  if (!clean(input.channel) || !clean(input.messageId)) throw new Error('business_goal_missing_channel_or_message_id');

  const goal = input.requestedGoal || inferBusinessGoal(clean(input.intent, 160), clean(input.message, 8000));
  const continuity = await openOrResumeOmnichannelJourney({
    channel: input.channel,
    messageId: input.messageId,
    threadId: input.threadId,
    sessionId: input.sessionId,
    journeyId: input.journeyId,
    actor: input.actor,
    intent: input.intent || goal,
    requirements: input.requirements
  });

  const pendingFacts = input.actor === 'customer' ? requiredOperationalFacts(goal) : [];
  const nextAction = nextActionFor(goal, input.actor, pendingFacts);
  const actionsExecuted = ['resolve_identity_continuity', 'load_organizational_memory', 'classify_business_goal', 'separate_truth_planes'];
  const verificationTaskIds: string[] = [];
  let verificationExecution: unknown;

  if (pendingFacts.length) {
    await recordVerificationPending({
      channel: input.channel,
      messageId: input.messageId,
      threadId: input.threadId,
      sessionId: continuity.sessionId,
      journeyId: continuity.journeyId,
      correlationId: continuity.correlationId,
      keys: pendingFacts,
      nextAction
    });
    actionsExecuted.push('record_verification_requirements');

    const verificationTask = await createVerificationTask({
      correlationId: continuity.correlationId,
      journeyId: continuity.journeyId,
      sessionId: continuity.sessionId,
      goal,
      requiredFacts: pendingFacts,
      requirements: input.requirements,
      nextAction,
      sourceChannel: input.channel
    });
    verificationTaskIds.push(verificationTask.task.taskId);
    actionsExecuted.push(verificationTask.created ? 'create_verification_task' : 'resume_verification_task');

    // Try the configured live adapter immediately. The task remains durable and
    // pending when no adapter is configured, evidence is partial, or the source
    // cannot prove live truth; no synthetic availability is generated.
    verificationExecution = await attemptVerificationTask(verificationTask.task).catch((error: any) => ({
      taskId: verificationTask.task.taskId,
      status: 'pending',
      reason: clean(error?.message, 600) || 'Live verification attempt failed.'
    }));
    actionsExecuted.push('attempt_live_verification');
  }

  const executionStatus = String((verificationExecution as any)?.status || '');
  const customerCommunicationState: BusinessGoalExecution['customerCommunicationState'] =
    input.actor === 'provider'
      ? 'not_required'
      : executionStatus === 'human_review'
        ? 'human_review'
        : pendingFacts.length
          ? 'awaiting_verification'
          : 'ready_for_acknowledgement';

  await rememberOrganizationalFlow({
    journeyId: continuity.journeyId,
    sessionId: continuity.sessionId,
    correlationId: continuity.correlationId,
    channel: input.channel,
    externalMessageId: `${input.messageId}:goal`,
    externalThreadId: input.threadId,
    direction: 'internal',
    actor: 'system',
    intent: goal,
    status: executionStatus === 'verified' ? 'verification_complete' : 'goal_classified',
    actionsExecuted,
    providerRequests: [],
    nextAction,
    metadata: {
      goal,
      pendingFactCount: pendingFacts.length,
      verificationTaskIds,
      verificationExecution,
      customerCommunicationState
    }
  });

  await emitOperationalEvent({
    type: 'business.goal.classified',
    source: 'business_goal_orchestrator',
    conversationId: continuity.journeyId || continuity.sessionId,
    payload: {
      correlationId: continuity.correlationId,
      goal,
      channel: input.channel,
      actor: input.actor,
      pendingFacts,
      verificationTaskIds,
      verificationExecution,
      nextAction
    }
  }).catch(() => undefined);

  return {
    correlationId: continuity.correlationId,
    journeyId: continuity.journeyId,
    sessionId: continuity.sessionId,
    goal,
    confirmedFacts: continuity.confirmedFacts,
    verifiedFacts: executionStatus === 'verified' ? [((verificationExecution as any)?.observedFacts || {})] : [],
    pendingFacts: executionStatus === 'verified' ? [] : pendingFacts,
    actionsExecuted,
    verificationTaskIds,
    providerRequests: [],
    verificationExecution,
    nextAction: executionStatus === 'verified' ? 'prepare_evidence_backed_quote_or_continue_domain_workflow' : nextAction,
    customerCommunicationState
  };
}
