import type { ActionClass } from '../backend/autonomyPolicy';
import type { GovernanceActor, OwnerApprovalAction } from './ownerApprovalTypes';

export type JarvisTaskStatus =
  | 'blocked_autonomy'
  | 'waiting_approval'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'escalated';

export type JarvisDelegation = {
  id: string;
  objective: string;
  actionClass: ActionClass;
  preferredAgentId: string;
  assignedAgentId: string | null;
  assignmentReason: string;
  status: JarvisTaskStatus;
  runId: string | null;
  retryCount: number;
  approvalAction: OwnerApprovalAction | null;
  approvalId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JarvisPlanRecord = {
  id: string;
  commandId: string;
  requestedBy: GovernanceActor;
  ownerOrder: string;
  language: 'es' | 'en';
  understood: string;
  plan: string[];
  delegations: JarvisDelegation[];
  approvalRequired: Array<{
    taskId: string;
    action: OwnerApprovalAction;
    approvalId: string;
    summary: string;
  }>;
  status: 'planned' | 'in_progress' | 'waiting_approval' | 'completed' | 'needs_owner';
  executiveSummary: string;
  createdAt: string;
  updatedAt: string;
  version: 1;
};

export type JarvisCommandResponse = {
  understood: string;
  plan: string[];
  whoDoesIt: Array<{
    taskId: string;
    agentId: string | null;
    status: JarvisTaskStatus;
    runId: string | null;
    reason: string;
  }>;
  approvalRequired: JarvisPlanRecord['approvalRequired'];
  executiveSummary: string;
  planId: string;
  commandId: string;
};
