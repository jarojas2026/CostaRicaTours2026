/**
 * Triaje automático de leads (funciones puras, sin E/S).
 *
 * Al crear un lead se calcula:
 *  - prioridad: alta (fecha + pax + contacto válido), media (contacto válido y
 *    algún dato del viaje), baja (sin datos útiles);
 *  - estado de triaje: activo | spam | duplicado | descartado.
 *    · spam: texto basura ("hola", "test", "asdf"…) sin fecha concreta;
 *    · descartado: sin ningún contacto válido (correo o teléfono);
 *    · duplicado: mismo correo + mismo tour en las últimas 24 h.
 *
 * El triaje es independiente de la máquina de estados comercial (nuevo →
 * cotizando → …): no la toca, guarda el motivo y siempre es reversible desde
 * /admin/leads (historial en `triage.history`).
 */

export const LEAD_TRIAGE_STATES = ['activo', 'spam', 'duplicado', 'descartado'] as const;
export type LeadTriageState = typeof LEAD_TRIAGE_STATES[number];
export const LEAD_PRIORITIES = ['alta', 'media', 'baja'] as const;
export type LeadPriority = typeof LEAD_PRIORITIES[number];

export type LeadTriageReason =
  | 'sin_contacto_valido'
  | 'texto_basura'
  | 'duplicado_24h'
  | 'descartado_manual'
  | 'restaurado_manual';

export interface LeadTriageChange {
  from: LeadTriageState | null;
  to: LeadTriageState;
  at: string;
  by: string;
  reason: string;
}

export interface LeadTriage {
  state: LeadTriageState;
  /** Calidad de los datos; no cambia al descartar/restaurar (no es el estado). */
  priority: LeadPriority;
  /** Motivos legibles del estado actual (vacío si activo). */
  reasons: LeadTriageReason[];
  /** true si el estado lo fijó el sistema; false si lo cambió una persona. */
  auto: boolean;
  duplicateOf?: string;
  hasValidContact: boolean;
  at: string;
  history: LeadTriageChange[];
}

export const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isLeadTriageState(value: unknown): value is LeadTriageState {
  return typeof value === 'string' && (LEAD_TRIAGE_STATES as readonly string[]).includes(value);
}

export function isLeadPriority(value: unknown): value is LeadPriority {
  return typeof value === 'string' && (LEAD_PRIORITIES as readonly string[]).includes(value);
}

const EMAIL_OK = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const FAKE_EMAIL = /^(test|prueba|asdf|qwerty|aaa+|x+|no|none|na)@|@(test|example|mailinator|asdf)\./i;

/** Contacto válido = correo con forma real (no de prueba obvia) o teléfono de ≥ 8 dígitos. */
export function hasValidContact(contact: { email?: unknown; phone?: unknown } | null | undefined): boolean {
  if (!contact) return false;
  const email = typeof contact.email === 'string' ? contact.email.trim().toLowerCase() : '';
  if (email && EMAIL_OK.test(email) && !FAKE_EMAIL.test(email)) return true;
  const phone = typeof contact.phone === 'string' ? contact.phone.replace(/\D/g, '') : '';
  return phone.length >= 8 && !/^(\d)\1+$/.test(phone);
}

/** Palabras de relleno que por sí solas no dicen nada de un viaje. */
const FILLER = new Set([
  'hola', 'holaa', 'ola', 'buenas', 'buenos', 'dias', 'días', 'tardes', 'noches', 'saludos', 'hey', 'hi', 'hello', 'helo', 'yo',
  'ok', 'oki', 'okay', 'si', 'sí', 'no', 'gracias', 'thanks', 'thx', 'info', 'informacion', 'información', 'information',
  'test', 'testing', 'prueba', 'probando', 'asdf', 'qwerty', 'xd', 'jaja', 'jajaja', 'lol', 'urgente', 'urgent', 'urgencia',
  'please', 'pls', 'porfa', 'por', 'favor', 'quiero', 'necesito', 'a', 'e', 'y', 'the', 'de', 'la', 'el', 'un', 'una',
  'precio', 'price', 'pura', 'vida',
]);

/**
 * Texto basura: vacío de contenido real ("hola", "test", "asdfgh", "????",
 * "hola urgente"). Un mensaje vacío NO es basura (el formulario lo permite).
 */
export function isJunkLeadText(text: unknown): boolean {
  const raw = typeof text === 'string' ? text : '';
  const normalized = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!normalized.trim()) return false;
  const words = normalized.split(/[^a-z0-9ñ]+/).filter(Boolean);
  if (!words.length) return true; // solo signos/emojis
  const meaningful = words.filter(word => {
    if (FILLER.has(word)) return false;
    if (/^(.)\1+$/.test(word)) return false; // "aaaa", "1111"
    if (word.length >= 4 && !/[aeiouy0-9]/.test(word)) return false; // "sdfgh"
    if (/^(asd|qwe|zxc|jkl|hjk)/.test(word)) return false; // teclado
    return word.length >= 2;
  });
  return meaningful.join('').length < 3;
}

export interface TriageInput {
  id: string;
  createdAt: string;
  contact: { email?: string; phone?: string } | null;
  /** Contacto tal como llegó (antes de redactar por falta de consentimiento). */
  rawContact?: { email?: string; phone?: string } | null;
  request: { tourId?: string; date?: string; month?: number; people?: number };
  message?: string;
}

export function computeLeadPriority(input: Pick<TriageInput, 'request'> & { validContact: boolean }): LeadPriority {
  const hasDate = Boolean(input.request.date);
  const hasPeople = Boolean(input.request.people && input.request.people > 0);
  if (input.validContact && hasDate && hasPeople) return 'alta';
  if (input.validContact && (hasDate || hasPeople || input.request.month)) return 'media';
  return 'baja';
}

export interface RecentLeadRef {
  id: string;
  createdAt: string;
  email?: string;
  tourId?: string;
  triageState?: LeadTriageState;
}

/** Busca un lead anterior con el mismo correo + tour en las últimas 24 h. */
export function findDuplicateOf(input: Pick<TriageInput, 'id' | 'contact' | 'rawContact' | 'request'>, recent: readonly RecentLeadRef[], now: Date): string | undefined {
  const email = (input.contact?.email || input.rawContact?.email || '').toLowerCase();
  const tourId = input.request.tourId;
  if (!email || !tourId) return undefined;
  const match = recent
    .filter(r => r.id !== input.id && r.email?.toLowerCase() === email && r.tourId === tourId)
    .filter(r => now.getTime() - Date.parse(r.createdAt) < DUPLICATE_WINDOW_MS && Date.parse(r.createdAt) <= now.getTime())
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  return match?.id;
}

/** Triaje inicial (automático) de un lead recién creado. */
export function triageNewLead(input: TriageInput, recent: readonly RecentLeadRef[] = [], now: Date = new Date()): LeadTriage {
  const at = now.toISOString();
  const validContact = hasValidContact(input.contact) || hasValidContact(input.rawContact);
  const priority = computeLeadPriority({ request: input.request, validContact });
  const reasons: LeadTriageReason[] = [];
  let state: LeadTriageState = 'activo';
  let duplicateOf: string | undefined;
  if (!validContact) {
    state = 'descartado';
    reasons.push('sin_contacto_valido');
  }
  if (isJunkLeadText(input.message) && !input.request.date) {
    state = 'spam';
    reasons.push('texto_basura');
  }
  if (state === 'activo') {
    duplicateOf = findDuplicateOf(input, recent, now);
    if (duplicateOf) {
      state = 'duplicado';
      reasons.push('duplicado_24h');
    }
  }
  return {
    state,
    priority,
    reasons,
    auto: true,
    ...(duplicateOf ? { duplicateOf } : {}),
    hasValidContact: validContact,
    at,
    history: [{ from: null, to: state, at, by: 'system:triage', reason: reasons.join(',') || 'ok' }],
  };
}

/**
 * Triaje derivado para leads antiguos que se guardaron antes de existir el
 * triaje (no detecta duplicados; no se persiste hasta que alguien actúa).
 */
export function deriveLegacyTriage(input: TriageInput): LeadTriage {
  return triageNewLead(input, [], new Date(input.createdAt || Date.now()));
}

/** Cambio manual (reversible): descartar o restaurar desde /admin/leads. */
export function applyManualTriage(current: LeadTriage, to: 'descartado' | 'activo', by: string, note: string | undefined, now: Date = new Date()): LeadTriage {
  const at = now.toISOString();
  const reason: LeadTriageReason = to === 'activo' ? 'restaurado_manual' : 'descartado_manual';
  const text = note ? `${reason}: ${note.slice(0, 200)}` : reason;
  const next: LeadTriage = {
    ...current,
    state: to,
    reasons: to === 'activo' ? [] : [reason],
    auto: false,
    at,
    history: [...(current.history || []), { from: current.state, to, at, by, reason: text }],
  };
  if (to === 'activo') delete next.duplicateOf;
  return next;
}

/** Leads que cuentan para alertas/riesgo: solo los activos. */
export function isActionableTriage(triage: LeadTriage | undefined): boolean {
  return !triage || triage.state === 'activo';
}
