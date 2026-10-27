/**
 * Registro de herramientas de la Fase C del asistente IA (aditivo a agentTools.ts).
 * Cada etapa añade aquí su herramienta: entrada en el registro (con sideEffect),
 * declaración para function calling y el despacho a su servicio.
 *
 * Reglas comunes:
 *  - Nunca datos del operador hacia el cliente.
 *  - El canal voz sigue bloqueando herramientas transaccionales (voiceHandoffPolicy).
 *  - Las herramientas con efectos solo escriben en colecciones privadas de servidor
 *    (Firestore Admin SDK; las reglas cliente siguen en Default Deny).
 */
import { getPolicies, getProduct } from './agentProductTools';
import { AGENT_EVENT_TYPES, logEvent } from './agentEventLog';
import { AGENT_TICKET_PRIORITIES, AGENT_TICKET_REASONS, createTicket } from './agentSupportTicket';

/** Contexto que pone el SERVIDOR (no el modelo) al ejecutar una herramienta. */
export interface AgentToolContext {
  sessionId?: string;
  /** Último mensaje literal del cliente en este turno (para verificar confirmaciones explícitas). */
  userMessage?: string;
  channel?: 'chat' | 'voice' | 'whatsapp' | 'admin';
  language?: 'es' | 'en';
}

export const PHASE_C_TOOL_REGISTRY = {
  get_product: {
    description: 'Return catalog details of one tour by id/slug (description, inclusions, duration, difficulty, reference price status). Never includes operator data.',
    sideEffect: false
  },
  get_policies: {
    description: 'Return the published cancellation policy and terms (legal pages) without promising refunds beyond them.',
    sideEffect: false
  },
  log_event: {
    description: 'Record a conversation event (type, leadId, small data object) in a private server collection. Server sets the timestamp; leadId/sessionId are stored hashed; names, emails and phones are never stored.',
    sideEffect: true
  },
  create_ticket: {
    description: 'Escalate to a human when the agent cannot resolve: creates an open support ticket (reason, priority, hashed leadId, short sanitized summary) in a private server collection and returns its ticket number. Sends no emails or messages.',
    sideEffect: true
  },
} as const;

export type PhaseCToolName = keyof typeof PHASE_C_TOOL_REGISTRY;

export function isPhaseCTool(name: string): name is PhaseCToolName {
  return Object.prototype.hasOwnProperty.call(PHASE_C_TOOL_REGISTRY, name);
}

export const PHASE_C_DECLARATIONS = [
  {
    name: 'get_product',
    description: 'Get full catalog details of ONE tour by its id (from search results): description, highlights, inclusions/exclusions, what to bring, duration, difficulty, minimum age, departure times, itinerary steps and price status (reference price or quote required). Never contains operator names or contacts.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tourId: { type: 'STRING', description: 'Tour id or slug from the catalog' },
        language: { type: 'STRING', description: 'es | en' }
      },
      required: ['tourId']
    }
  },
  {
    name: 'get_policies',
    description: 'Get the published cancellation policy and terms & conditions. Quote only this text; never promise refunds, deadlines or percentages beyond it.',
    parameters: {
      type: 'OBJECT',
      properties: {
        topic: { type: 'STRING', description: 'cancellation | terms | all' },
        language: { type: 'STRING', description: 'es | en' },
        tourId: { type: 'STRING', description: 'Optional tour id to include its catalog free-cancellation flag' }
      }
    }
  },
  {
    name: 'log_event',
    description: `Record ONE internal conversation event for analytics (not shown to the customer). type must be one of: ${AGENT_EVENT_TYPES.join(', ')}. Never put names, emails, phone numbers, addresses or document numbers in data: they are discarded. The server sets the timestamp.`,
    parameters: {
      type: 'OBJECT',
      properties: {
        type: { type: 'STRING', description: `Event type: ${AGENT_EVENT_TYPES.join(' | ')}` },
        leadId: { type: 'STRING', description: 'Optional lead id (stored only as a hash)' },
        data: {
          type: 'OBJECT',
          description: 'Optional small object of short non-personal values (max 8 keys)',
          properties: {
            tourId: { type: 'STRING', description: 'Catalog tour id' },
            intent: { type: 'STRING', description: 'Short intent label, e.g. quote, availability' },
            topic: { type: 'STRING', description: 'Short topic label' },
            reason: { type: 'STRING', description: 'Short non-personal reason' },
            count: { type: 'NUMBER', description: 'Optional small count (e.g. travelers)' }
          }
        }
      },
      required: ['type']
    }
  },
  {
    name: 'create_ticket',
    description: `Escalate to a human teammate when you cannot resolve the request. reason must be one of: ${AGENT_TICKET_REASONS.join(', ')}. priority: ${AGENT_TICKET_PRIORITIES.join(' | ')} (default normal). summary: one short sentence of what is needed, WITHOUT names, emails, phone numbers, addresses, document numbers or links (they are removed). Returns a ticket number to share with the customer; never promise a response time. No message is sent to anyone.`,
    parameters: {
      type: 'OBJECT',
      properties: {
        reason: { type: 'STRING', description: `Escalation reason: ${AGENT_TICKET_REASONS.join(' | ')}` },
        priority: { type: 'STRING', description: `Priority: ${AGENT_TICKET_PRIORITIES.join(' | ')}` },
        summary: { type: 'STRING', description: 'Short non-personal summary (max 200 chars)' },
        leadId: { type: 'STRING', description: 'Optional lead id (stored only as a hash)' },
        data: {
          type: 'OBJECT',
          description: 'Optional small object of short non-personal values (max 8 keys)',
          properties: {
            tourId: { type: 'STRING', description: 'Catalog tour id' },
            topic: { type: 'STRING', description: 'Short topic label' },
            travelDate: { type: 'STRING', description: 'Travel date as YYYYMM or month label (no full dates)' },
            count: { type: 'NUMBER', description: 'Optional small count (e.g. travelers)' }
          }
        }
      },
      required: ['reason', 'summary']
    }
  },
];

export async function executePhaseCTool(name: PhaseCToolName, args: Record<string, any>, context: AgentToolContext = {}): Promise<any> {
  const language = args.language === 'en' || args.language === 'es' ? args.language : context.language;
  switch (name) {
    case 'get_product':
      return getProduct({ tourId: args.tourId ?? args.id, language });
    case 'get_policies':
      return getPolicies({ topic: args.topic, language, tourId: args.tourId });
    case 'log_event':
      return logEvent(
        { type: args.type, leadId: args.leadId, data: args.data },
        { sessionId: context.sessionId, channel: context.channel, language: context.language }
      );
    case 'create_ticket':
      return createTicket(
        { reason: args.reason, priority: args.priority, leadId: args.leadId, summary: args.summary, data: args.data },
        { sessionId: context.sessionId, channel: context.channel, language: context.language }
      );
  }
}
