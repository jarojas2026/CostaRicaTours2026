import { randomUUID } from 'crypto';
import { getFirestoreDb } from './bookingService';

export type AgentMessage = {
  id: string;
  conversationId: string;
  fromAgent: string;
  toAgent: string;
  audience: 'customer' | 'provider' | 'internal';
  type: 'context' | 'handoff' | 'request' | 'response' | 'alert';
  subject: string;
  payload: Record<string, any>;
  correlationId?: string;
  createdAt: string;
  status: 'queued' | 'processed' | 'failed';
};

function sanitize(value: any, depth = 0): any {
  if (depth > 4) return '[depth-limit]';
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map(v => sanitize(v, depth + 1));
  return Object.fromEntries(Object.entries(value).slice(0, 80).map(([k, v]) => [k, sanitize(v, depth + 1)]));
}

export async function sendAgentMessage(message: Omit<AgentMessage, 'id' | 'createdAt' | 'status'>) {
  const event: AgentMessage = { ...message, id: randomUUID(), createdAt: new Date().toISOString(), status: 'queued', payload: sanitize(message.payload) };
  const db = getFirestoreDb();
  if (db) await db.collection('agent_messages').doc(event.id).set(event);
  return event;
}

export async function getAgentInbox(agentId: string, limit = 20) {
  const db = getFirestoreDb();
  if (!db) return [];
  const snap = await db.collection('agent_messages').where('toAgent', '==', agentId).where('status', '==', 'queued').limit(Math.min(limit, 50)).get();
  return snap.docs.map(d => d.data());
}

export async function publishAgentEvent(type: string, payload: Record<string, any>, conversationId = 'system') {
  const db = getFirestoreDb();
  const event = { id: randomUUID(), type, conversationId, payload: sanitize(payload), createdAt: new Date().toISOString() };
  if (db) await db.collection('agent_events').doc(event.id).set(event);
  return event;
}
