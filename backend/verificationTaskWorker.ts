import { emitOperationalEvent } from './operationalEventBus';
import { observationEvidence, queryLiveInventory } from './liveInventoryGateway';
import {
  deferVerificationTask,
  failVerificationTask,
  getVerificationTask,
  markVerificationTaskInProgress,
  recordVerificationObservation,
  type VerificationTask
} from './verificationTaskService';

export type VerificationExecutionResult = {
  taskId: string;
  status: 'verified' | 'partial' | 'pending' | 'human_review' | 'not_found';
  reason?: string;
  remainingFacts?: string[];
  observedFacts?: Record<string, unknown>;
};

const MAX_AUTOMATED_ATTEMPTS = Math.max(1, Math.min(10, Number(process.env.VERIFICATION_MAX_ATTEMPTS || 4)));

export async function attemptVerificationTask(task: VerificationTask): Promise<VerificationExecutionResult> {
  if (!task?.taskId) return { taskId: '', status: 'not_found', reason: 'Missing verification task.' };
  if (task.status === 'verified') return { taskId: task.taskId, status: 'verified', remainingFacts: [] };
  if (task.status === 'human_review' || task.status === 'failed') {
    return { taskId: task.taskId, status: 'human_review', reason: task.failureReason || `Task is ${task.status}.` };
  }

  await markVerificationTaskInProgress(task.taskId);
  const result = await queryLiveInventory({
    goal: task.goal,
    correlationId: task.correlationId,
    journeyId: task.journeyId,
    requirements: task.requirements || {}
  });

  if (result.status === 'not_configured') {
    await deferVerificationTask(task.taskId, result.reason, 30 * 60_000);
    await emitOperationalEvent({
      type: 'verification.task.adapter_not_configured',
      source: 'verification_task_worker',
      conversationId: task.journeyId || task.sessionId,
      payload: { taskId: task.taskId, goal: task.goal, reason: result.reason }
    }).catch(() => undefined);
    return { taskId: task.taskId, status: 'pending', reason: result.reason, remainingFacts: task.remainingFacts || task.requiredFacts };
  }

  if (result.status === 'error' || result.status === 'unverified') {
    const attempt = Number(task.attemptCount || 0) + 1;
    const reason = result.reason;
    if (attempt >= MAX_AUTOMATED_ATTEMPTS) {
      await failVerificationTask(task.taskId, reason, true);
      await emitOperationalEvent({
        type: 'verification.task.human_review',
        source: 'verification_task_worker',
        conversationId: task.journeyId || task.sessionId,
        payload: { taskId: task.taskId, goal: task.goal, reason, attempts: attempt }
      }).catch(() => undefined);
      return { taskId: task.taskId, status: 'human_review', reason };
    }
    await deferVerificationTask(task.taskId, reason, Math.min(60 * 60_000, 60_000 * 2 ** attempt));
    return { taskId: task.taskId, status: 'pending', reason, remainingFacts: task.remainingFacts || task.requiredFacts };
  }

  const evidence = observationEvidence(result.observation);
  const observation = await recordVerificationObservation({
    taskId: task.taskId,
    evidence,
    facts: result.observation.facts,
    retryAfterMs: 5 * 60_000
  });
  const remainingFacts = Array.isArray((observation as any).remainingFacts) ? (observation as any).remainingFacts : [];
  const verified = remainingFacts.length === 0;

  await emitOperationalEvent({
    type: verified ? 'verification.task.verified' : 'verification.task.partial_observation',
    source: 'verification_task_worker',
    conversationId: task.journeyId || task.sessionId,
    payload: {
      taskId: task.taskId,
      goal: task.goal,
      source: result.observation.source,
      observedAt: result.observation.observedAt,
      remainingFacts
    }
  }).catch(() => undefined);

  return {
    taskId: task.taskId,
    status: verified ? 'verified' : 'partial',
    remainingFacts,
    observedFacts: result.observation.facts
  };
}

export async function attemptVerificationTaskById(taskId: string) {
  const task = await getVerificationTask(taskId);
  if (!task) return { taskId, status: 'not_found' as const, reason: 'Verification task was not found.' };
  return attemptVerificationTask(task);
}
