/**
 * Step 2 — Supervisor Orchestrator.
 * Existing supervisor/self-healing remains intact; this adds a deterministic
 * routing layer that decides which agent should receive an operational event.
 */
import { sendAgentMessage, publishAgentEvent } from './agentMeshService';

export type SupervisorDecision = {
  targetAgent: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  reason: string;
  requiresHuman: boolean;
  safeToAutoExecute: boolean;
};

const ROUTES: Array<{ match: RegExp; agent: string; priority: SupervisorDecision['priority']; reason: string }> = [
  { match: /pago|payment|stripe|paypal|sinpe/i, agent: 'booking', priority: 'high', reason: 'Evento financiero requiere coordinación de reserva/pago.' },
  { match: /proveedor|provider|operador|pickup|recogida/i, agent: 'provider_liaison', priority: 'high', reason: 'Evento requiere coordinación externa.' },
  { match: /alerta|emergencia|clima|vuelo|retraso|cancel/i, agent: 'operations', priority: 'critical', reason: 'Evento operativo potencialmente disruptivo.' },
  { match: /reserva|booking|disponibilidad|cupo/i, agent: 'booking', priority: 'high', reason: 'Evento relacionado con ciclo de reserva.' },
  { match: /cliente|customer|chat|consulta|prospect/i, agent: 'concierge', priority: 'normal', reason: 'Evento de atención al cliente.' }
];

export function decideSupervisorRoute(eventType: string, payload: Record<string, any> = {}): SupervisorDecision {
  const text = [eventType, payload.subject, payload.message, payload.reason].filter(Boolean).join(' ');
  const hit = ROUTES.find(x => x.match.test(text));
  if (!hit) return {
    targetAgent: 'triage',
    priority: 'normal',
    reason: 'Sin ruta especializada; triage debe clasificar el evento.',
    requiresHuman: false,
    safeToAutoExecute: false
  };
  const requiresHuman = hit.priority === 'critical' || /refund|reembolso|chargeback|delete|cancelación/i.test(text);
  return { targetAgent: hit.agent, priority: hit.priority, reason: hit.reason, requiresHuman, safeToAutoExecute: !requiresHuman };
}

export async function superviseEvent(eventType: string, payload: Record<string, any> = {}, conversationId = 'system') {
  const decision = decideSupervisorRoute(eventType, payload);
  const message = await sendAgentMessage({
    conversationId,
    fromAgent: 'supervisor',
    toAgent: decision.targetAgent,
    audience: 'internal',
    type: decision.requiresHuman ? 'alert' : 'handoff',
    subject: eventType,
    payload: { ...payload, supervisorDecision: decision }
  });
  await publishAgentEvent('supervisor.routed', { eventType, decision, messageId: message.id }, conversationId);
  return { decision, messageId: message.id };
}
