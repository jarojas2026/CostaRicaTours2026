/**
 * Auditoría del portal de proveedores en el ledger inmutable existente
 * (`agent_audit_log`, mismo formato que agentGovernanceService/ownerApprovalService).
 * Sin PII: solo ids, rol, acción, estados y motivo.
 */
import crypto from 'crypto';

export const PROVIDER_AUDIT_COLLECTION = 'agent_audit_log';

export interface ProviderAuditActor {
  uid: string | null;
  email: null;
  role: string;
  providerId?: string | null;
}

export function buildProviderAuditRecord(input: {
  action: string;
  target: string;
  actor: ProviderAuditActor;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason?: string | null;
  now?: string;
  id?: string;
}) {
  return {
    id: input.id || `audit_${crypto.randomUUID()}`,
    action: String(input.action).slice(0, 120),
    target: String(input.target).slice(0, 180),
    actor: { uid: input.actor.uid, email: null, role: input.actor.role, providerId: input.actor.providerId ?? null },
    before: input.before,
    after: input.after,
    reason: input.reason ? String(input.reason).trim().slice(0, 500) : null,
    createdAt: input.now || new Date().toISOString(),
    immutable: true,
    version: 1,
    domain: 'provider_portal',
  };
}
