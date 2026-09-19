/**
 * Step 5 — Internal operational event bus.
 * Uses the existing Firestore agent mesh as durable transport.
 */
import { publishAgentEvent } from './agentMeshService';
import { superviseEvent } from './supervisorOrchestrator';

export type OperationalEvent = {
  type: string;
  conversationId?: string;
  source: string;
  payload: Record<string, any>;
};

export async function emitOperationalEvent(event: OperationalEvent) {
  const published = await publishAgentEvent(event.type, {
    source: event.source,
    ...event.payload
  }, event.conversationId || 'system');

  const routing = await superviseEvent(
    event.type,
    { source: event.source, ...event.payload },
    event.conversationId || 'system'
  );

  return { published, routing };
}
