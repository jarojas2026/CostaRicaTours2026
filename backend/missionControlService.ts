/**
 * Read-only Mission Control projection for the owner.
 * Never treat a bounded query as an enterprise-wide total.
 * AgentRun ledger remains the source of truth; no parallel workflow engine.
 */
import { getFirestoreDb } from './bookingService';
import { listOwnerApprovals } from './ownerApprovalService';
import { listJarvisPlans } from './jarvisOrchestrator';
import { projectMissionRun, projectMissionApproval, safeMissionDate, summarizeMissionRunSample } from './missionControlProjection';
import type { AgentRunRecord } from '../shared/agentOfficeTypes';
export { summarizeMissionRunSample } from './missionControlProjection';

export type MissionControlSourceState = 'observed' | 'unavailable';

const MAX_RUNS = 60;
const MAX_APPROVALS = 40;
const MAX_PLANS = 30;

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
    ? approvalResult.value.map(projectMissionApproval) : [];

  const plans = planResult.status === 'fulfilled'
    ? planResult.value.map(value => ({
      id: value.id,
      status: value.status,
      createdAt: safeMissionDate(value.createdAt),
      updatedAt: safeMissionDate(value.updatedAt),
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
    runs: runs.map(projectMissionRun),
    runSample: sources.runs === 'observed' ? summarizeMissionRunSample(runs) : null,
    approvals,
    plans,
  };
}

