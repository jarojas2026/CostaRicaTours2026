/**
 * Fase C — herramienta log_event: registra eventos de la conversación del asistente IA
 * (tipo, lead, marca de tiempo y un objeto de datos pequeño) en Firestore.
 *
 * Privacidad (Ley 8968 / PRODHAB):
 *  - Nunca se guardan datos personales en claro: ni nombres, ni correos, ni teléfonos.
 *  - leadId y sessionId se guardan solo como hash SHA-256 truncado.
 *  - `data` solo admite valores primitivos cortos; se descartan claves con nombre de dato
 *    personal y cualquier texto que parezca correo, teléfono o URL.
 *  - La marca de tiempo la pone el SERVIDOR (el modelo no puede fecharla).
 *
 * Solo escribe en la colección privada de servidor `agent_conversation_events`
 * (Admin SDK; las reglas cliente siguen en Default Deny). Nunca lanza: si no hay
 * Firestore devuelve `recorded:false`. No cobra, no envía nada, no borra nada.
 */
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';

export const AGENT_EVENT_COLLECTION = 'agent_conversation_events';

/** Tipos de evento permitidos (lista cerrada). */
export const AGENT_EVENT_TYPES = [
  'conversation_started',
  'intent_detected',
  'product_viewed',
  'policy_viewed',
  'quote_requested',
  'handoff_requested',
  'objection_raised',
  'conversation_closed',
  'other',
] as const;
export type AgentEventType = typeof AGENT_EVENT_TYPES[number];

export const AGENT_EVENT_DATA_MAX_KEYS = 8;
export const AGENT_EVENT_STRING_MAX = 80;

/** Claves que se descartan siempre de `data` (datos personales o de contacto). */
const PII_KEY_PATTERN = /(name|nombre|apellido|email|e-mail|correo|mail|phone|tel[eé]fono|telefono|celular|movil|m[oó]vil|whatsapp|address|direcci[oó]n|cedula|c[eé]dula|passport|pasaporte|dni|document|birth|nacimiento|card|tarjeta|iban|cuenta|account|ip$|^ip|user_?agent|contact|contacto)/i;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const URL_PATTERN = /(https?:\/\/|www\.|wa\.me\/)/i;
/** 7 o más dígitos (ignorando espacios, guiones, puntos, paréntesis y +) ⇒ posible teléfono/documento. */
const LONG_DIGITS_PATTERN = /(\d[\s\-().+]*){7,}/;
const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;

export function hashIdentifier(kind: 'lead' | 'session', value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  return crypto.createHash('sha256').update(`crt:${kind}:${raw}`).digest('hex').slice(0, 32);
}

function looksPersonal(text: string): boolean {
  return EMAIL_PATTERN.test(text) || URL_PATTERN.test(text) || LONG_DIGITS_PATTERN.test(text);
}

/** Deja solo primitivos cortos y sin datos personales. Devuelve también las claves descartadas. */
export function sanitizeEventData(input: unknown): { data: Record<string, string | number | boolean>; dropped: string[] } {
  const data: Record<string, string | number | boolean> = {};
  const dropped: string[] = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { data, dropped };
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (Object.keys(data).length >= AGENT_EVENT_DATA_MAX_KEYS) { dropped.push(key); continue; }
    if (!KEY_PATTERN.test(key) || PII_KEY_PATTERN.test(key)) { dropped.push(key); continue; }
    if (typeof value === 'boolean') { data[key] = value; continue; }
    if (typeof value === 'number') {
      if (Number.isFinite(value) && !LONG_DIGITS_PATTERN.test(String(value))) data[key] = value; else dropped.push(key);
      continue;
    }
    if (typeof value === 'string') {
      const text = value.trim().slice(0, AGENT_EVENT_STRING_MAX);
      if (text && !looksPersonal(text)) data[key] = text; else dropped.push(key);
      continue;
    }
    dropped.push(key); // objetos, arreglos, null, etc.
  }
  return { data, dropped };
}

export interface AgentEventLogDeps {
  /** Inyectable en tests. `null` ⇒ almacenamiento no disponible. */
  db?: { collection: (name: string) => { add: (doc: Record<string, unknown>) => Promise<{ id: string }> } } | null;
  now?: () => Date;
}

export interface LogEventInput {
  type?: unknown;
  leadId?: unknown;
  data?: unknown;
}

export interface LogEventContext {
  sessionId?: string;
  channel?: 'chat' | 'voice' | 'whatsapp' | 'admin';
  language?: 'es' | 'en';
}

export async function logEvent(input: LogEventInput, context: LogEventContext = {}, deps: AgentEventLogDeps = {}) {
  const type = String(input.type ?? '').trim();
  if (!(AGENT_EVENT_TYPES as readonly string[]).includes(type)) {
    return { success: false as const, recorded: false, error: 'invalid_event_type', allowedTypes: [...AGENT_EVENT_TYPES] };
  }
  const { data, dropped } = sanitizeEventData(input.data);
  const timestamp = (deps.now ?? (() => new Date()))().toISOString();
  const record = {
    type,
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
  if (!db) return { success: false as const, recorded: false, error: 'storage_unavailable', type, timestamp };
  try {
    const ref = await db.collection(AGENT_EVENT_COLLECTION).add({ ...record, createdAt: FieldValue.serverTimestamp() });
    return { success: true as const, recorded: true, eventId: ref.id, type, timestamp, droppedKeys: dropped.length };
  } catch {
    return { success: false as const, recorded: false, error: 'storage_write_failed', type, timestamp };
  }
}
