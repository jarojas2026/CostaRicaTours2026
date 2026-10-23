/**
 * Secuencia de seguimiento de leads (#389). Funciones puras + runner con
 * dependencias inyectadas: SOLO genera borradores en una cola interna.
 * Nada se envía a clientes desde aquí; el único envío real sigue siendo el
 * acuse T+0 que ya existe en leadPipeline.
 *
 *   T+0   acuse existente (se registra como 'existente', no se duplica)
 *   T+2h  borrador: seguimiento (pide fecha/pax si faltan)
 *   T+24h borrador: seguimiento con 1 alternativa del catálogo
 *   T+72h borrador: cierre suave y el lead queda marcado 'frio'
 *
 * Horario permitido 08:00–20:00 America/Costa_Rica (UTC-6 fijo, sin horario
 * de verano): lo que vence fuera se corre a la siguiente apertura.
 * Sin precios, sin proveedores/operadores, sin PII más allá del nombre de pila
 * y el correo del propio lead (destinatario del borrador).
 */
import { buildFollowUpDraft, missingLeadData, type FollowUpLeadView } from './leadFollowUp';
import { leadPublicReference } from '../shared/tourQuoteRequest';

export const SEQUENCE_STEPS = ['ack_t0', 'followup_t2h', 'alternative_t24h', 'soft_close_t72h'] as const;
export type SequenceStep = typeof SEQUENCE_STEPS[number];
export const STEP_OFFSET_MS: Record<SequenceStep, number> = {
  ack_t0: 0,
  followup_t2h: 2 * 60 * 60 * 1000,
  alternative_t24h: 24 * 60 * 60 * 1000,
  soft_close_t72h: 72 * 60 * 60 * 1000,
};
export const BUSINESS_HOURS_CR = { open: 8, close: 20 } as const;
const CR_OFFSET_MS = -6 * 60 * 60 * 1000;

export interface SequenceDraft {
  step: SequenceStep;
  status: 'existente' | 'borrador_no_enviado' | 'omitido';
  omittedReason?: 'sin_alternativa_en_catalogo';
  queue: 'interna';
  dueAt: string;
  createdAt: string;
  to?: string;
  subject?: string;
  body?: string;
  alternativeTourId?: string;
}

export interface LeadFollowUpSequence {
  drafts: SequenceDraft[];
  temperature: 'activo' | 'frio';
  stoppedReason?: string;
  updatedAt: string;
}

export interface CatalogAlternative { id: string; title: string; region?: string; activity?: string }

export interface SequenceLeadView extends FollowUpLeadView {
  status: string;
  createdAt: string;
  lastActivityAt?: string;
  consent?: { dataProcessing?: boolean };
  triage?: { state?: string };
  request: FollowUpLeadView['request'] & { tourId?: string; region?: string; activity?: string };
  followUpSequence?: LeadFollowUpSequence;
}

/** true si el instante cae entre 08:00 y 20:00 hora de Costa Rica. */
export function isWithinBusinessHoursCR(at: Date): boolean {
  const h = new Date(at.getTime() + CR_OFFSET_MS).getUTCHours();
  return h >= BUSINESS_HOURS_CR.open && h < BUSINESS_HOURS_CR.close;
}

/** Corre un instante a la siguiente apertura (08:00 CR) si cae fuera de horario. */
export function nextBusinessSlotCR(at: Date): Date {
  if (isWithinBusinessHoursCR(at)) return at;
  const local = new Date(at.getTime() + CR_OFFSET_MS);
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const openToday = day + BUSINESS_HOURS_CR.open * 3600_000;
  const target = local.getUTCHours() < BUSINESS_HOURS_CR.open ? openToday : openToday + 24 * 3600_000;
  return new Date(target - CR_OFFSET_MS);
}

export function stepDueAt(createdAt: string, step: SequenceStep): Date {
  return nextBusinessSlotCR(new Date(new Date(createdAt).getTime() + STEP_OFFSET_MS[step]));
}

/** Una alternativa real del catálogo: misma región o actividad, nunca el mismo tour. */
export function pickCatalogAlternative(request: SequenceLeadView['request'], catalog: readonly CatalogAlternative[]): CatalogAlternative | null {
  const others = catalog.filter(t => t && t.id && t.title && t.id !== request.tourId);
  return others.find(t => request.region && t.region === request.region && request.activity && t.activity === request.activity)
    || others.find(t => request.region && t.region === request.region)
    || others.find(t => request.activity && t.activity === request.activity)
    || null;
}

/** Motivo para no seguir la secuencia, o null si aplica. */
export function sequenceStopReason(lead: SequenceLeadView): string | null {
  if (!['nuevo', 'cotizando'].includes(lead.status)) return 'lead_no_abierto';
  if (lead.triage?.state && lead.triage.state !== 'activo') return `triaje_${lead.triage.state}`;
  if (lead.consent?.dataProcessing !== true) return 'sin_consentimiento';
  if (!lead.contact?.email) return 'sin_correo';
  if (lead.lastActivityAt && new Date(lead.lastActivityAt).getTime() > new Date(lead.createdAt).getTime() + 60_000) return 'atendido_por_humano';
  return null;
}

const T = {
  es: {
    hello: (n: string) => `Hola ${n}:`,
    t2h: (tour: string) => `Seguimos con tu solicitud para "${tour}". Si nos confirmas los datos pendientes, preparamos la cotización con disponibilidad y precio verificados.`,
    t24h: (tour: string, alt: string) => `Mientras confirmamos "${tour}", una opción similar de nuestro catálogo es "${alt}". Si te interesa, responde y la incluimos en la cotización.`,
    t72h: (tour: string) => `No queremos insistir: dejamos en pausa tu solicitud para "${tour}". Cuando quieras retomarla, responde a este correo y seguimos donde quedamos.`,
    subj: { followup_t2h: 'Seguimos con tu solicitud', alternative_t24h: 'Una opción similar para tu viaje', soft_close_t72h: 'Tu solicitud queda en pausa' },
    noCharge: 'No se ha hecho ningún cargo.',
    ref: (r: string) => `Referencia: ${r}`,
    fallbackName: 'viajero', fallbackTour: 'tu experiencia en Costa Rica',
  },
  en: {
    hello: (n: string) => `Hi ${n},`,
    t2h: (tour: string) => `Following up on your request for "${tour}". Once you confirm the missing details, we will prepare a quote with verified availability and price.`,
    t24h: (tour: string, alt: string) => `While we confirm "${tour}", a similar option from our catalog is "${alt}". If you are interested, reply and we will add it to the quote.`,
    t72h: (tour: string) => `We do not want to insist: your request for "${tour}" is now on hold. Whenever you want to pick it up again, just reply to this email.`,
    subj: { followup_t2h: 'Following up on your request', alternative_t24h: 'A similar option for your trip', soft_close_t72h: 'Your request is on hold' },
    noCharge: 'You have not been charged.',
    ref: (r: string) => `Reference: ${r}`,
    fallbackName: 'traveler', fallbackTour: 'your Costa Rica experience',
  },
} as const;

function buildStepDraft(lead: SequenceLeadView, step: Exclude<SequenceStep, 'ack_t0'>, now: Date, alt: CatalogAlternative | null): SequenceDraft | null {
  const lang = lead.language === 'en' ? 'en' : 'es';
  const t = T[lang];
  const name = lead.contact?.name?.trim().split(/\s+/)[0] || t.fallbackName;
  const tour = lead.request.tourTitle || lead.request.activityLabel || lead.request.regionLabel || t.fallbackTour;
  const ref = leadPublicReference(lead.id) || '';
  let main: string;
  if (step === 'followup_t2h') {
    const missingDraft = missingLeadData(lead.request).length ? buildFollowUpDraft(lead, now) : null;
    if (missingDraft) {
      return { step, status: 'borrador_no_enviado', queue: 'interna', dueAt: stepDueAt(lead.createdAt, step).toISOString(), createdAt: now.toISOString(), to: missingDraft.to, subject: missingDraft.subject, body: missingDraft.body };
    }
    main = t.t2h(tour);
  } else if (step === 'alternative_t24h') {
    if (!alt) return null;
    main = t.t24h(tour, alt.title);
  } else {
    main = t.t72h(tour);
  }
  const body = [t.hello(name), '', main, t.noCharge, '', ref ? t.ref(ref) : '', 'Costa Rica Tours'].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
  return {
    step, status: 'borrador_no_enviado', queue: 'interna',
    dueAt: stepDueAt(lead.createdAt, step).toISOString(), createdAt: now.toISOString(),
    to: lead.contact!.email, subject: t.subj[step], body,
    ...(step === 'alternative_t24h' && alt ? { alternativeTourId: alt.id } : {}),
  };
}

/**
 * Avanza la secuencia de un lead: añade a la cola interna los borradores
 * vencidos (y dentro de horario CR) que aún no existen. Devuelve null si no hay cambios.
 */
export function advanceLeadFollowUpSequence(lead: SequenceLeadView, now: Date, catalog: readonly CatalogAlternative[] = []): LeadFollowUpSequence | null {
  const current: LeadFollowUpSequence = lead.followUpSequence || { drafts: [], temperature: 'activo', updatedAt: now.toISOString() };
  if (current.temperature === 'frio' || current.stoppedReason) return null;
  const stop = sequenceStopReason(lead);
  if (stop) return { ...current, stoppedReason: stop, updatedAt: now.toISOString() };
  if (!isWithinBusinessHoursCR(now)) return null;
  const done = new Set(current.drafts.map(d => d.step));
  const added: SequenceDraft[] = [];
  let temperature: LeadFollowUpSequence['temperature'] = current.temperature;
  for (const step of SEQUENCE_STEPS) {
    if (done.has(step) || stepDueAt(lead.createdAt, step).getTime() > now.getTime()) continue;
    if (step === 'ack_t0') {
      added.push({ step, status: 'existente', queue: 'interna', dueAt: lead.createdAt, createdAt: now.toISOString() });
      continue;
    }
    const draft = buildStepDraft(lead, step, now, step === 'alternative_t24h' ? pickCatalogAlternative(lead.request, catalog) : null);
    if (draft) added.push(draft);
    else added.push({ step, status: 'omitido', omittedReason: 'sin_alternativa_en_catalogo', queue: 'interna', dueAt: stepDueAt(lead.createdAt, step).toISOString(), createdAt: now.toISOString() });
    if (step === 'soft_close_t72h') temperature = 'frio';
  }
  if (!added.length) return null;
  return { drafts: [...current.drafts, ...added], temperature, updatedAt: now.toISOString() };
}

export interface SequenceRunnerDeps {
  listOpenLeads: () => Promise<SequenceLeadView[]>;
  saveSequence: (leadId: string, sequence: LeadFollowUpSequence) => Promise<void>;
  catalog: readonly CatalogAlternative[];
  now?: Date;
}

/** Runner sin envíos: solo persiste borradores en la cola interna de cada lead. */
export async function runLeadFollowUpSequence(deps: SequenceRunnerDeps): Promise<{ checked: number; updated: number; drafts: number; sent: 0 }> {
  const now = deps.now || new Date();
  const leads = await deps.listOpenLeads();
  let updated = 0; let drafts = 0;
  for (const lead of leads) {
    const next = advanceLeadFollowUpSequence(lead, now, deps.catalog);
    if (!next) continue;
    drafts += next.drafts.length - (lead.followUpSequence?.drafts.length || 0);
    await deps.saveSequence(lead.id, next);
    updated++;
  }
  return { checked: leads.length, updated, drafts, sent: 0 };
}
