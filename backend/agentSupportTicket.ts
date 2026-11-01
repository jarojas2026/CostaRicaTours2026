/**
 * Fase C — herramienta create_ticket: el asistente IA escala a una persona cuando no puede
 * resolver. Crea un tiquete de soporte interno (motivo, prioridad, lead con hash, resumen
 * corto saneado, marca de tiempo del servidor, estado 'open') y devuelve su número
 * (TCK-YYYYMMDD-XXXX).
 *
 * Privacidad (Ley 8968 / PRODHAB), mismo criterio que log_event (agentEventLog.ts):
 *  - leadId y sessionId se guardan solo como hash SHA-256 truncado.
 *  - El resumen se corta y se le eliminan correos, teléfonos/documentos (7+ dígitos) y URLs.
 *  - `data` opcional pasa por sanitizeEventData (sin claves de dato personal, solo primitivos cortos).
 *  - La marca de tiempo y el número de tiquete los pone el SERVIDOR.
 *
 * Solo escribe en la colección privada de servidor `agent_support_tickets` (Admin SDK; las
 * reglas cliente caen en el deny catch-all). Nunca lanza. No envía correos, SMS ni WhatsApp,
 * no llama APIs externas, no cobra y no borra nada: una persona revisa la cola.
 */
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { hashIdentifier, sanitizeEventData, type AgentEventLogDeps } from './agentEventLog';

export const AGENT_TICKET_COLLECTION = 'agent_support_tickets';

/** Motivos de escalamiento permitidos (lista cerrada). */
export const AGENT_TICKET_REASONS = [
  'unresolved_question',
  'booking_issue',
  'payment_issue',
  'cancellation_refund',
  'complaint',
  'special_request',
  'technical_problem',
  'human_requested',
  'other',
] as const;
export type AgentTicketReason = typeof AGENT_TICKET_REASONS[number];

export const AGENT_TICKET_PRIORITIES = ['low', 'normal', 'high'] as const;
export type AgentTicketPriority = typeof AGENT_TICKET_PRIORITIES[number];

export const AGENT_TICKET_SUMMARY_MAX = 200;
const REDACTED = '[redactado]';

const EMAIL_GLOBAL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const URL_GLOBAL = /(https?:\/\/|www\.|wa\.me\/)\S*/gi;
/** 7 o más dígitos (con espacios, guiones, puntos, paréntesis o +) ⇒ posible teléfono/documento/tarjeta. */
const LONG_DIGITS_GLOBAL = /\+?(\d[\s\-().+]*){6,}\d/g;

/** Resumen corto sin correos, teléfonos, documentos ni URLs. */
export function sanitizeTicketSummary(input: unknown): { summary: string; redactions: number } {
  if (typeof input !== 'string') return { summary: '', redactions: 0 };
  let redactions = 0;
  const count = () => { redactions++; return REDACTED; };
  let text = input
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(EMAIL_GLOBAL, count)
    .replace(URL_GLOBAL, count)
    .replace(LONG_DIGITS_GLOBAL, count)
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length > AGENT_TICKET_SUMMARY_MAX) text = `${text.slice(0, AGENT_TICKET_SUMMARY_MAX - 1).trimEnd()}…`;
  return { summary: text, redactions };
}

/** TCK-YYYYMMDD-XXXX con la fecha en hora de Costa Rica (UTC-6, sin horario de verano). */
export function buildTicketNumber(now: Date, randomHex: string): string {
  const cr = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const ymd = cr.toISOString().slice(0, 10).replace(/-/g, '');
  return `TCK-${ymd}-${randomHex.toUpperCase().slice(0, 4).padStart(4, '0')}`;
}

export interface AgentTicketDeps extends AgentEventLogDeps {
  /** Inyectable en tests: 4 caracteres hex. */
  randomHex?: () => string;
}

export interface CreateTicketInput {
  reason?: unknown;
  priority?: unknown;
  leadId?: unknown;
  summary?: unknown;
  data?: unknown;
}

export interface CreateTicketContext {
  sessionId?: string;
  channel?: 'chat' | 'voice' | 'whatsapp' | 'admin';
  language?: 'es' | 'en';
}

export async function createTicket(input: CreateTicketInput, context: CreateTicketContext = {}, deps: AgentTicketDeps = {}) {
  try {
    const reason = String(input.reason ?? '').trim();
    if (!(AGENT_TICKET_REASONS as readonly string[]).includes(reason)) {
      return { success: false as const, created: false, error: 'invalid_reason', allowedReasons: [...AGENT_TICKET_REASONS] };
    }
    const rawPriority = String(input.priority ?? 'normal').trim() || 'normal';
    if (!(AGENT_TICKET_PRIORITIES as readonly string[]).includes(rawPriority)) {
      return { success: false as const, created: false, error: 'invalid_priority', allowedPriorities: [...AGENT_TICKET_PRIORITIES] };
    }
    const priority = rawPriority as AgentTicketPriority;
    const { summary, redactions } = sanitizeTicketSummary(input.summary);
    if (!summary) return { success: false as const, created: false, error: 'summary_required' };
    const { data, dropped } = sanitizeEventData(input.data);

    const now = (deps.now ?? (() => new Date()))();
    const timestamp = now.toISOString();
    const ticketNumber = buildTicketNumber(now, (deps.randomHex ?? (() => crypto.randomBytes(2).toString('hex')))());
    const record = {
      ticketNumber,
      reason,
      priority,
      status: 'open' as const,
      summary,
      summaryRedactions: redactions,
      leadIdHash: hashIdentifier('lead', input.leadId),
      sessionIdHash: hashIdentifier('session', context.sessionId),
      channel: context.channel ?? null,
      language: context.language ?? null,
      timestamp,
      data,
      droppedKeys: dropped.length,
      source: 'agent_phase_c',
    };

    // Import diferido: evita el ciclo bookingService → agentTools → agentPhaseCRegistry → este módulo.
    const db = deps.db === undefined ? (await import('./bookingService')).getFirestoreDb() : deps.db;
    if (!db) return { success: false as const, created: false, error: 'storage_unavailable', reason, priority, timestamp };
    const ref = await db.collection(AGENT_TICKET_COLLECTION).add({ ...record, createdAt: FieldValue.serverTimestamp() });
    return {
      success: true as const,
      created: true,
      ticketNumber,
      ticketId: ref.id,
      status: 'open' as const,
      reason,
      priority,
      timestamp,
      message: 'Ticket created. A human from the team will review it; do not promise a specific response time.',
    };
  } catch {
    return { success: false as const, created: false, error: 'storage_write_failed' };
  }
}
