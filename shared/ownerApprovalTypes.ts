export const OWNER_APPROVAL_ACTIONS = [
  'payment',
  'refund',
  'payout',
  'customer_message',
  'mass_message',
  'price_change',
  'publication',
] as const;

export type OwnerApprovalAction = (typeof OWNER_APPROVAL_ACTIONS)[number];
export type OwnerApprovalStatus = 'pending' | 'approved' | 'rejected' | 'consumed';

export type GovernanceActor = {
  uid: string | null;
  email: string | null;
  role: string | null;
};

export type OwnerApprovalRequest = {
  id: string;
  action: OwnerApprovalAction;
  status: OwnerApprovalStatus;
  summary: string;
  resourceRef: string;
  payloadHash: string;
  metadata: Record<string, string | number | boolean | null>;
  requestedBy: GovernanceActor;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  decidedBy: GovernanceActor | null;
  rejectionReason: string | null;
  consumedAt: string | null;
  consumedBy: string | null;
  version: 1;
};
