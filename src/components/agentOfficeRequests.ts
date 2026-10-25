/**
 * Cliente de la pestaña "Oficina" en /admin. Solo habla con los endpoints existentes
 * de gobernanza, aprobaciones y JARVIS (todos con requireOwner/requireAdmin en el backend).
 * Ninguna petición de este archivo cobra, paga, reembolsa ni envía mensajes: aprobar
 * solo autoriza un uso único que el agente debe consumir después a través de la puerta
 * de acciones (authorizeAgentAction).
 */
export type OfficeRequest = { method: 'GET' | 'POST'; url: string; body?: Record<string, unknown> };
export type OfficeLanguage = 'es' | 'en';
export type ApprovalStatusFilter = 'pending' | 'approved' | 'rejected' | 'consumed';

const enc = (value: string) => encodeURIComponent(String(value || '').trim());

/** Nombres de campo para los errores de validación, según el idioma activo. */
const FIELD_LABELS = {
  reason: { es: 'Motivo', en: 'Reason' },
  order: { es: 'Orden', en: 'Order' },
  approvalId: { es: 'approvalId', en: 'approvalId' },
  agentId: { es: 'agentId', en: 'agentId' },
  planId: { es: 'planId', en: 'planId' },
} as const;

type FieldKey = keyof typeof FIELD_LABELS;

const lang = (language: unknown): OfficeLanguage => (language === 'en' ? 'en' : 'es');

/** Mensaje "campo obligatorio" localizado (ES/EN). */
export function requiredFieldMessage(field: FieldKey, language: OfficeLanguage = 'es'): string {
  const l = lang(language);
  const label = FIELD_LABELS[field][l];
  return l === 'en' ? `${label} is required.` : `${label} es obligatorio.`;
}

function requireText(value: string, field: FieldKey, language: OfficeLanguage, max = 1000): string {
  const text = String(value || '').trim();
  if (!text) throw new Error(requiredFieldMessage(field, language));
  return text.slice(0, max);
}

/**
 * Todas las funciones aceptan el idioma activo como último argumento (por defecto 'es')
 * para que los errores de validación salgan en ES o EN.
 */
export const officeRequests = {
  governance: (): OfficeRequest => ({ method: 'GET', url: '/api/admin/agent-office/governance' }),
  audit: (): OfficeRequest => ({ method: 'GET', url: '/api/admin/agent-office/audit' }),
  /** Sin filtro: historial reciente (todas las decisiones). */
  approvals: (): OfficeRequest => ({ method: 'GET', url: '/api/admin/agent-office/approvals' }),
  /** Filtro de estado del lado del servidor con paginación por cursor. */
  approvalsByStatus: (status: ApprovalStatusFilter, options: { limit?: number; cursor?: string | null } = {}): OfficeRequest => {
    const params = new URLSearchParams({ status, limit: String(Math.max(1, Math.min(100, Math.floor(options.limit || 50)))) });
    const cursor = String(options.cursor || '').trim();
    if (cursor) params.set('cursor', cursor.slice(0, 200));
    return { method: 'GET', url: `/api/admin/agent-office/approvals?${params.toString()}` };
  },
  approve: (approvalId: string, language: OfficeLanguage = 'es'): OfficeRequest => ({ method: 'POST', url: `/api/admin/agent-office/approvals/${enc(requireText(approvalId, 'approvalId', language, 200))}/approve`, body: {} }),
  reject: (approvalId: string, reason: string, language: OfficeLanguage = 'es'): OfficeRequest => ({ method: 'POST', url: `/api/admin/agent-office/approvals/${enc(requireText(approvalId, 'approvalId', language, 200))}/reject`, body: { reason: requireText(reason, 'reason', language, 500) } }),
  agentControl: (agentId: string, control: 'pause' | 'resume' | 'revoke' | 'restore', reason: string, language: OfficeLanguage = 'es'): OfficeRequest => ({
    method: 'POST',
    url: `/api/admin/agent-office/agents/${enc(requireText(agentId, 'agentId', language, 120))}/${control}`,
    body: { reason: requireText(reason, 'reason', language, 500) },
  }),
  shutdown: (reason: string, language: OfficeLanguage = 'es'): OfficeRequest => ({ method: 'POST', url: '/api/admin/agent-office/shutdown', body: { reason: requireText(reason, 'reason', language, 500) } }),
  resumeAll: (reason: string, language: OfficeLanguage = 'es'): OfficeRequest => ({ method: 'POST', url: '/api/admin/agent-office/resume-all', body: { reason: requireText(reason, 'reason', language, 500) } }),
  jarvisCommand: (order: string, language: OfficeLanguage): OfficeRequest => ({ method: 'POST', url: '/api/admin/jarvis/command', body: { order: requireText(order, 'order', lang(language), 4000), language: lang(language) } }),
  jarvisPlans: (limit = 20): OfficeRequest => ({ method: 'GET', url: `/api/admin/jarvis/plans?limit=${Math.max(1, Math.min(40, Math.floor(limit)))}` }),
  jarvisReconcile: (planId: string, language: OfficeLanguage = 'es'): OfficeRequest => ({ method: 'POST', url: `/api/admin/jarvis/plans/${enc(requireText(planId, 'planId', language, 200))}/reconcile`, body: {} }),
};
