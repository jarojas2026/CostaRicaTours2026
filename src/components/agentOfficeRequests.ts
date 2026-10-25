/**
 * Cliente de la pestaña "Oficina" en /admin. Solo habla con los endpoints existentes
 * de gobernanza, aprobaciones y JARVIS (todos con requireOwner/requireAdmin en el backend).
 * Ninguna petición de este archivo cobra, paga, reembolsa ni envía mensajes: aprobar
 * solo autoriza un uso único que el agente debe consumir después a través de la puerta
 * de acciones (authorizeAgentAction).
 */
export type OfficeRequest = { method: 'GET' | 'POST'; url: string; body?: Record<string, unknown> };

const enc = (value: string) => encodeURIComponent(String(value || '').trim());

function requireText(value: string, field: string, max = 1000): string {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${field} es obligatorio.`);
  return text.slice(0, max);
}

export const officeRequests = {
  governance: (): OfficeRequest => ({ method: 'GET', url: '/api/admin/agent-office/governance' }),
  audit: (): OfficeRequest => ({ method: 'GET', url: '/api/admin/agent-office/audit' }),
  approvals: (): OfficeRequest => ({ method: 'GET', url: '/api/admin/agent-office/approvals' }),
  approve: (approvalId: string): OfficeRequest => ({ method: 'POST', url: `/api/admin/agent-office/approvals/${enc(requireText(approvalId, 'approvalId', 200))}/approve`, body: {} }),
  reject: (approvalId: string, reason: string): OfficeRequest => ({ method: 'POST', url: `/api/admin/agent-office/approvals/${enc(requireText(approvalId, 'approvalId', 200))}/reject`, body: { reason: requireText(reason, 'Motivo', 500) } }),
  agentControl: (agentId: string, control: 'pause' | 'resume' | 'revoke' | 'restore', reason: string): OfficeRequest => ({
    method: 'POST',
    url: `/api/admin/agent-office/agents/${enc(requireText(agentId, 'agentId', 120))}/${control}`,
    body: { reason: requireText(reason, 'Motivo', 500) },
  }),
  shutdown: (reason: string): OfficeRequest => ({ method: 'POST', url: '/api/admin/agent-office/shutdown', body: { reason: requireText(reason, 'Motivo', 500) } }),
  resumeAll: (reason: string): OfficeRequest => ({ method: 'POST', url: '/api/admin/agent-office/resume-all', body: { reason: requireText(reason, 'Motivo', 500) } }),
  jarvisCommand: (order: string, language: 'es' | 'en'): OfficeRequest => ({ method: 'POST', url: '/api/admin/jarvis/command', body: { order: requireText(order, 'Orden', 4000), language } }),
  jarvisPlans: (limit = 20): OfficeRequest => ({ method: 'GET', url: `/api/admin/jarvis/plans?limit=${Math.max(1, Math.min(40, Math.floor(limit)))}` }),
  jarvisReconcile: (planId: string): OfficeRequest => ({ method: 'POST', url: `/api/admin/jarvis/plans/${enc(requireText(planId, 'planId', 200))}/reconcile`, body: {} }),
};
