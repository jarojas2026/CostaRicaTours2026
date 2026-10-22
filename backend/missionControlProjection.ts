import type { AgentRunRecord, AgentRunStatus } from '../shared/agentOfficeTypes';

export function safeMissionDate(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
}

type MissionRunInput = Pick<AgentRunRecord,
  'id' | 'agentId' | 'status' | 'createdAt' | 'updatedAt' | 'durationMs' | 'lastStepSequence'>;

/** Strict overview allowlist: free text and error details stay in their domain ledgers. */
export function projectMissionRun(run: MissionRunInput) {
  return {
    id: String(run.id || '').slice(0, 128),
    agentId: String(run.agentId || '').slice(0, 128),
    status: run.status,
    createdAt: safeMissionDate(run.createdAt),
    updatedAt: safeMissionDate(run.updatedAt),
    durationMs: Number.isFinite(run.durationMs) ? run.durationMs : null,
    lastStepSequence: Number.isSafeInteger(run.lastStepSequence) ? run.lastStepSequence : 0,
  };
}

export function projectMissionApproval(value: {
  id: string; action: string; status: string; createdAt?: unknown;
}) {
  return {
    id: value.id,
    action: value.action,
    status: value.status,
    createdAt: safeMissionDate(value.createdAt),
  };
}

export function summarizeMissionRunSample(runs: readonly Pick<AgentRunRecord, 'status'>[]) {
  const known: AgentRunStatus[] = [
    'queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled', 'revoked',
  ];
  const byStatus = Object.fromEntries(known.map(status => [status, 0])) as Record<AgentRunStatus, number>;
  for (const run of runs) {
    if (Object.prototype.hasOwnProperty.call(byStatus, run.status)) byStatus[run.status] += 1;
  }
  return {
    sampled: runs.length,
    byStatus,
    unfinishedInSample: byStatus.queued + byStatus.running + byStatus.waiting_approval,
  };
}
