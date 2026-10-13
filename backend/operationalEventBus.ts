/**
 * Internal operational event bus.
 * Durable transport remains the existing Firestore agent mesh.
 *
 * Business events keep the historical supervisor routing behavior.
 * Agent-runtime telemetry is published without routing back through the
 * supervisor, preventing heartbeat recursion and message storms.
 */
import { publishAgentEvent } from './agentMeshService';
import { superviseEvent } from './supervisorOrchestrator';

export type OperationalEvent = {
  type: string;
  conversationId?: string;
  source: string;
  payload: Record<string, unknown>;
};

export const AGENT_OPERATIONAL_EVENT_TYPES = [
  'agent.started',
  'agent.step',
  'agent.waiting_approval',
  'agent.completed',
  'agent.failed',
  'agent.heartbeat',
  'agent.paused',
  'agent.revoked',
] as const;

export type AgentOperationalEventType = (typeof AGENT_OPERATIONAL_EVENT_TYPES)[number];

export type AgentOperationalEvent = {
  type: AgentOperationalEventType;
  agentId: string;
  runId?: string | null;
  conversationId?: string;
  source?: string;
  payload?: Record<string, unknown>;
};

export async function emitOperationalEvent(event: OperationalEvent) {
  const envelope = {
    source: event.source,
    ...event.payload,
  };
  const published = await publishAgentEvent(
    event.type,
    envelope,
    event.conversationId || 'system',
  );

  const routing = await superviseEvent(
    event.type,
    envelope,
    event.conversationId || 'system',
  );

  return { published, routing };
}

export async function emitAgentOperationalEvent(event: AgentOperationalEvent) {
  const agentId = String(event.agentId || '').trim();
  if (!agentId) throw new Error('agentId es obligatorio para telemetría de agentes.');

  const runId = event.runId ? String(event.runId).trim() : null;
  const published = await publishAgentEvent(
    event.type,
    {
      ...(event.payload || {}),
      source: event.source || 'agent-runtime',
      agentId,
      runId,
    },
    event.conversationId || runId || 'agent-runtime',
  );

  return { published, routing: null };
}
