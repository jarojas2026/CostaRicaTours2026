/**
 * Read-only Mission Control projection for the owner.
 * Never treat a bounded query as an enterprise-wide total.
 * AgentRun ledger remains the source of truth; no parallel workflow engine.
 */
import { getFirestoreDb } from './bookingService';
import { listOwnerApprovals } from './ownerApprovalService';
import { listJarvisPlans } from './jarvisOrchestrator';
import { scrubText } from '../shared/observability/scrubPii';
import type { AgentRunRecord, AgentRunStatus } from '../shared/agentOfficeTypes';

export type MissionControlSourceState = 'observed' | 'unavailable';

const MAX_RUNS = 60;
const MAX_APPROVALS = 40;
const MAX_PLANS = 30;

function safeDate(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? value : null;
}

function projectedRun(run: AgentRunRecord) {
  return {
    id: String(run.id || '').slice(0, 128),
    agentId: String(run.agentId || '').slice(0, 128),
    // Truncate and redact for an owner-facing overview; full objectives remain in the ledger.
    objective: scrubText(String(run.objective || '').slice(0, 180)),
    status: run.status,
    createdAt: safeDate(run.createdAt),
    updatedAt: safeDate(run.updatedAt),
    durationMs: Number.isFinite(run.durationMs) ? run.durationMs : null,
    errorCode: run.error?.code ? String(run.error.code).slice(0, 120) : null,
    lastStepSequence: Number.isSafeInteger(run.lastStepSequence) ? run.lastStepSequence : 0,
  };
}

export function summarizeMissionRunSample(runs: readonly Pick<AgentRunRecord, 'status'>[]) {
  const known: AgentRunStatus[] = [
    'queued', 'running', 'waiting_approval',
    'completed', 'failed', 'cancelled', 'revoked',
  ];
  const byStatus = Object.fromEntries(known.map(status => [status, 0])) as Record<AgentRunStatus, number>;
  for (const run of runs) {
    if (Object.prototype.hasOwnProperty.call(byStatus, run.status)) {
      byStatus[run.status] += 1;
    }
  }
  return {
    sampled: runs.length,
    byStatus,
    // This is a sample breakdown, not a system-wide success rate.
    unfinishedInSample: byStatus.queued + byStatus.running + byStatus.waiting_approval,
  };
}

export async function getOwnerMissionControlSnapshot() {
  const generatedAt = new Date().toISOString();
  const db = getFirestoreDb();
  if (!db) return {
    generatedAt,
    overallState: 'unavailable' as const,
    limits: { runs: MAX_RUNS, approvals: MAX_APPROVALS, plans: MAX_PLANS },
    sources: { runs: 'unavailable' as const, approvals: 'unavailable' as const, plans: 'unavailable' as const },
    runs: [],
    runSample: null,
    approvals: [],
    plans: [],
  };

  const [runResult, approvalResult, planResult] = await Promise.allSettled([
    db.collection('agentRuns').orderBy('createdAt', 'desc').limit(MAX_RUNS).get(),
    listOwnerApprovals({ limit: MAX_APPROVALS }),
    listJarvisPlans(MAX_PLANS),
  ]);

  const runs: AgentRunRecord[] = runResult.status === 'fulfilled'
    ? runResult.value.docs.map(doc => ({ ...doc.data(), id: doc.id }) as AgentRunRecord)
    : [];

  const approvals = approvalResult.status === 'fulfilled'
    ? approvalResult.value.map(value => ({
      id: value.id,
      action: value.action,
      status: value.status,
      summary: scrubText(String(value.summary || '').slice(0, 180)),
      createdAt: safeDate(value.createdAt),
    })) : [];

  const plans = planResult.status === 'fulfilled'
    ? planResult.value.map(value => ({
      id: value.id,
      status: value.status,
      createdAt: safeDate(value.createdAt),
      updatedAt: safeDate(value.updatedAt),
      delegatedTasks: Array.isArray(value.delegations) ? value.delegations.length : 0,
      awaitingApproval: Array.isArray(value.approvalRequired) ? value.approvalRequired.length : 0,
    })) : [];

  const sources: Record<'runs'|'approvals'|'plans', MissionControlSourceState> = {
    runs: runResult.status === 'fulfilled' ? 'observed' : 'unavailable',
    approvals: approvalResult.status === 'fulfilled' ? 'observed' : 'unavailable',
    plans: planResult.status === 'fulfilled' ? 'observed' : 'unavailable',
  };

  return {
    generatedAt: new Date().toISOString(),
    overallState: Object.values(sources).every(state => state === 'observed')
      ? 'sample' as const : 'partial' as const,
    limits: { runs: MAX_RUNS, approvals: MAX_APPROVALS, plans: MAX_PLANS },
    sources,
    runs: runs.map(projectedRun),
    runSample: sources.runs === 'observed' ? summarizeMissionRunSample(runs) : null,
    approvals,
    plans,
  };
}
