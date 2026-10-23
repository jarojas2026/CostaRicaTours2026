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
];

export async function executePhaseCTool(name: PhaseCToolName, args: Record<string, any>, context: AgentToolContext = {}): Promise<any> {
  const language = args.language === 'en' || args.language === 'es' ? args.language : context.language;
  switch (name) {
    case 'get_product':
      return getProduct({ tourId: args.tourId ?? args.id, language });
    case 'get_policies':
      return getPolicies({ topic: args.topic, language, tourId: args.tourId });
  }
}
