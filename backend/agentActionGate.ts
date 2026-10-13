import { autonomyPolicy, type ActionClass } from './autonomyPolicy';
import { assertAgentExecutionAuthorized } from './agentGovernanceService';
import { consumeOwnerApproval } from './ownerApprovalService';
import type { OwnerApprovalAction } from '../shared/ownerApprovalTypes';

const APPROVAL_ACTIONS = new Set<OwnerApprovalAction>([
  'payment',
  'refund',
  'payout',
  'customer_message',
  'mass_message',
  'price_change',
  'publication',
]);

function asApprovalAction(action: ActionClass): OwnerApprovalAction | null {
  return APPROVAL_ACTIONS.has(action as OwnerApprovalAction)
    ? action as OwnerApprovalAction
    : null;
}

export type AgentActionAuthorization = {
  allowed: true;
  authorizationEpoch: number;
  autonomyLevel: 0 | 1 | 2 | 3;
  basis: 'autonomy_policy' | 'owner_approval';
  approvalId: string | null;
};

export async function authorizeAgentAction(input: {
  agentId: string;
  action: ActionClass;
  expectedAuthorizationEpoch?: number;
  approvalId?: string | null;
  approvalResourceRef?: string | null;
  consumer: string;
}): Promise<AgentActionAuthorization> {
  const governance = await assertAgentExecutionAuthorized(
    input.agentId,
    input.expectedAuthorizationEpoch,
  );
  const autonomyLevel = governance.autonomyLevel || 0;
  const policy = autonomyPolicy(autonomyLevel, input.action);

  if (policy.allowed) {
    return {
      allowed: true,
      authorizationEpoch: governance.authorizationEpoch || 1,
      autonomyLevel,
      basis: 'autonomy_policy',
      approvalId: null,
    };
  }

  const approvalAction = asApprovalAction(input.action);
  if (!approvalAction) {
    throw new Error(`La acción ${input.action} requiere intervención humana y no tiene un canal automático de aprobación.`);
  }

  const approvalId = String(input.approvalId || '').trim();
  const resourceRef = String(input.approvalResourceRef || '').trim();
  if (!approvalId || !resourceRef) {
    throw new Error(`La acción ${input.action} requiere una aprobación explícita del owner.`);
  }

  await consumeOwnerApproval({
    approvalId,
    action: approvalAction,
    resourceRef,
    consumer: String(input.consumer || input.agentId).slice(0, 160),
  });

  return {
    allowed: true,
    authorizationEpoch: governance.authorizationEpoch || 1,
    autonomyLevel,
    basis: 'owner_approval',
    approvalId,
  };
}
