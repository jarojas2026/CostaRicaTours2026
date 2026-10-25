/**
 * Pagos a proveedores ligados a un lead/reserva — registro MANUAL (solo backend, owner).
 *
 * Flujo legal (docs/REGLAS_PLATAFORMA.md §7): el cliente paga SOLO servicios propios de
 * Costa Rica Tours (tour, transporte, entradas de un paquete) con el checkout Stripe TEST
 * existente. Después, la empresa paga a su proveedor por SINPE o transferencia FUERA del
 * sistema, como cualquier compra propia, y aquí solo se REGISTRA.
 *
 * Este módulo NUNCA ejecuta pagos, no llama a SINPE, bancos, PayPal ni Stripe, y no acepta
 * números SINPE de clientes: no hay campo de destino. Pagar SINPE a terceros por cuenta del
 * cliente sería actividad del art. 15 de la Ley 7786 (inscripción SUGEF) y no se ofrece.
 *
 * Estados: pendiente_aprobacion → aprobado (solo dueño humano) → pagado_manual (el dueño
 * ingresa referencia SINPE/transferencia y fecha). cancelado desde pendiente o aprobado.
 * Ningún agente de IA puede aprobar ni registrar pagos. Solo se crea si la reserva enlazada
 * tiene el pago del cliente verificado por el servidor (webhook firmado / retorno verificado:
 * paymentStatus=completed + paymentVerifiedAt). Cada cambio queda en audit (quién, cuándo).
 *
 * Distinto de providerPayoutService (liquidación automática PayPal, intacta): aquí no hay
 * ejecución automática de ningún tipo.
 */
import { verifiedAmountUSD } from './leadBookingLink';
import type { LeadMutation, LeadRecord } from './leadPipeline';

export const SUPPLIER_PAYOUT_STATES = ['pendiente_aprobacion', 'aprobado', 'pagado_manual', 'cancelado'] as const;
export type SupplierPayoutState = typeof SUPPLIER_PAYOUT_STATES[number];
export const SUPPLIER_PAYOUT_METHODS = ['sinpe', 'transferencia'] as const;
export type SupplierPayoutMethod = typeof SUPPLIER_PAYOUT_METHODS[number];
export type SupplierPayoutAction = 'crear' | 'aprobar' | 'registrar_pago_manual' | 'cancelar';

const TRANSITIONS: Record<SupplierPayoutState, readonly SupplierPayoutState[]> = {
  pendiente_aprobacion: ['aprobado', 'cancelado'],
  aprobado: ['pagado_manual', 'cancelado'],
  pagado_manual: [],
  cancelado: [],
};

export function canTransitionSupplierPayout(from: SupplierPayoutState, to: SupplierPayoutState): boolean {
  return TRANSITIONS[from].includes(to);
}

export interface SupplierPayoutAuditEntry {
  action: SupplierPayoutAction;
  from: SupplierPayoutState | null;
  to: SupplierPayoutState;
  at: string;
  by: string;
  note?: string;
}

export interface SupplierPayout {
  id: string;
  bookingId: string;
  /** Proveedor tal como lo identifica el dueño (texto interno, solo admin; nunca se muestra al cliente). */
  proveedor: string;
  montoCRC: number;
  concepto: string;
  estado: SupplierPayoutState;
  createdAt: string;
  createdBy: string;
  approvedAt?: string;
  approvedBy?: string;
  /** Datos del pago hecho FUERA del sistema por el dueño. */
  metodo?: SupplierPayoutMethod;
  referencia?: string;
  fechaPago?: string;
  paidRecordedAt?: string;
  paidRecordedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  motivoCancelacion?: string;
  clientRequestId?: string;
  /** Registro de auditoría append-only. */
  audit: SupplierPayoutAuditEntry[];
  /** Recordatorio permanente: el sistema no movió dinero. */
  ejecutadoPorSistema: false;
}

/**
 * Quién actúa. `kind` lo fija el servidor (nunca el body): las rutas HTTP con sesión Firebase
 * de dueño son 'human'; cualquier herramienta/flujo de IA debe pasar 'agent'.
 */
export interface SupplierPayoutActor {
  by: string;
  role: string | null | undefined;
  authMethod?: string | null;
  kind: 'human' | 'agent';
}

export type SupplierPayoutError =
  | 'forbidden'
  | 'agent_not_allowed'
  | 'lead_without_booking'
  | 'booking_not_found'
  | 'customer_payment_not_verified'
  | 'invalid_input'
  | 'payout_not_found'
  | 'invalid_transition'
  | 'duplicate_request'
  | 'idempotency_conflict'
  | 'duplicate_reference';

type Result = LeadMutation<SupplierPayoutError>;

const LEAD_ID = /^[A-Za-z0-9_-]{1,80}$/;
const PAYOUT_ID = /^sp_[a-z0-9]{6,40}$/;
const REFERENCE = /^[A-Za-z0-9-]{4,40}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_ID = /^[A-Za-z0-9_-]{8,80}$/;
/** Tope de cordura para evitar errores de digitación (₡50 millones). */
export const MAX_SUPPLIER_PAYOUT_CRC = 50_000_000;

function fail(error: SupplierPayoutError, message: string): Result {
  return { ok: false, error, message };
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

/** Solo el dueño humano autenticado por Firebase puede aprobar o registrar pagos. */
export function isHumanOwner(actor: SupplierPayoutActor): boolean {
  return actor.kind === 'human' && actor.role === 'owner' && actor.authMethod === 'firebase';
}

/** Crear: dueño humano, o un agente de IA (solo queda pendiente_aprobacion; no puede avanzar). */
function canCreate(actor: SupplierPayoutActor): boolean {
  return actor.kind === 'agent' || isHumanOwner(actor);
}

/** Verificado por el servidor: misma regla que el monto verificado de /payment-status. */
export function isCustomerPaymentVerified(booking: any): boolean {
  return verifiedAmountUSD(booking) !== null;
}

export interface CreateSupplierPayoutInput {
  proveedor: string;
  montoCRC: number;
  concepto: string;
  clientRequestId?: string;
}

export function parseCreateInput(body: unknown): { ok: true; input: CreateSupplierPayoutInput } | { ok: false; message: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const proveedor = cleanText(b.proveedor, 120);
  const concepto = cleanText(b.concepto, 300);
  const monto = typeof b.montoCRC === 'number' ? b.montoCRC : typeof b.montoCRC === 'string' && /^\d+(\.\d{1,2})?$/.test(b.montoCRC.trim()) ? Number(b.montoCRC) : NaN;
  if (proveedor.length < 2) return { ok: false, message: 'proveedor requerido (2-120 caracteres).' };
  if (concepto.length < 3) return { ok: false, message: 'concepto requerido (3-300 caracteres).' };
  if (!Number.isFinite(monto) || monto <= 0 || monto > MAX_SUPPLIER_PAYOUT_CRC) return { ok: false, message: `montoCRC debe ser mayor que 0 y como máximo ${MAX_SUPPLIER_PAYOUT_CRC}.` };
  const rid = typeof b.clientRequestId === 'string' && REQUEST_ID.test(b.clientRequestId) ? b.clientRequestId : undefined;
  if (b.clientRequestId !== undefined && !rid) return { ok: false, message: 'clientRequestId inválido.' };
  // Defensa: nunca aceptar un destino de pago (número SINPE, IBAN, teléfono) en el registro.
  for (const k of ['sinpe', 'telefono', 'phone', 'iban', 'cuenta', 'destino', 'numeroSinpe']) {
    if (b[k] !== undefined) return { ok: false, message: 'El sistema no acepta destinos de pago: el dueño paga al proveedor fuera de la plataforma.' };
  }
  return { ok: true, input: { proveedor, montoCRC: Math.round(monto * 100) / 100, concepto, ...(rid ? { clientRequestId: rid } : {}) } };
}

export interface MarkPaidInput {
  metodo: SupplierPayoutMethod;
  referencia: string;
  fechaPago: string;
  note?: string;
}

export function parseMarkPaidInput(body: unknown, now: Date = new Date()): { ok: true; input: MarkPaidInput } | { ok: false; message: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const metodo = b.metodo;
  if (metodo !== 'sinpe' && metodo !== 'transferencia') return { ok: false, message: 'metodo: sinpe | transferencia.' };
  const referencia = typeof b.referencia === 'string' ? b.referencia.trim() : '';
  if (!REFERENCE.test(referencia)) return { ok: false, message: 'referencia requerida (4-40 caracteres: letras, números o guiones).' };
  const fechaPago = typeof b.fechaPago === 'string' ? b.fechaPago.trim() : '';
  const d = ISO_DATE.test(fechaPago) ? new Date(`${fechaPago}T12:00:00-06:00`) : null;
  if (!d || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== fechaPago) return { ok: false, message: 'fechaPago requerida (AAAA-MM-DD).' };
  const todayCR = now.toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
  if (fechaPago > todayCR) return { ok: false, message: 'fechaPago no puede ser futura.' };
  const note = cleanText(b.note, 300) || undefined;
  return { ok: true, input: { metodo, referencia, fechaPago, ...(note ? { note } : {}) } };
}

function payoutsOf(lead: LeadRecord): SupplierPayout[] {
  return Array.isArray(lead.supplierPayouts) ? lead.supplierPayouts : [];
}

function withPayouts(lead: LeadRecord, payouts: SupplierPayout[], at: string): LeadRecord {
  return { ...lead, supplierPayouts: payouts, updatedAt: at, lastActivityAt: at };
}

/**
 * ¿El registro existente corresponde a la misma solicitud? Compara la reserva y los campos ya
 * normalizados por parseCreateInput. La moneda es siempre CRC (campo montoCRC), así que coincide
 * por construcción; se compara el monto redondeado a céntimos.
 */
export function sameSupplierPayoutRequest(existing: SupplierPayout, bookingId: string, input: CreateSupplierPayoutInput): boolean {
  return existing.bookingId === bookingId
    && cleanText(existing.proveedor, 120) === input.proveedor
    && Math.round(Number(existing.montoCRC) * 100) === Math.round(input.montoCRC * 100)
    && cleanText(existing.concepto, 300) === input.concepto;
}

/** Regla pura de creación. `booking` es la reserva ENLAZADA al lead, leída del servidor. */
export function applyCreateSupplierPayout(
  lead: LeadRecord,
  booking: any | null,
  input: CreateSupplierPayoutInput,
  actor: SupplierPayoutActor,
  newId: string,
  now: Date = new Date(),
): Result {
  if (!canCreate(actor)) return fail('forbidden', 'Solo el dueño puede registrar pagos a proveedores.');
  const bookingId = String(lead.bookingId || '').trim();
  if (!bookingId) return fail('lead_without_booking', 'El lead no tiene una reserva enlazada.');
  if (!booking) return fail('booking_not_found', 'La reserva enlazada no existe.');
  if (!isCustomerPaymentVerified(booking)) {
    return fail('customer_payment_not_verified', 'El pago del cliente no está verificado por el servidor. No se registró nada.');
  }
  const existing = payoutsOf(lead);
  if (input.clientRequestId) {
    const dup = existing.find(p => p.clientRequestId === input.clientRequestId);
    if (dup) {
      // Misma clave de idempotencia: solo es un reintento si coincide la reserva y los campos
      // normalizados (proveedor, monto, moneda CRC, concepto). Si no, es otra intención → 409.
      if (!sameSupplierPayoutRequest(dup, bookingId, input)) {
        return fail('idempotency_conflict', 'Ese clientRequestId ya se usó con otros datos. No se registró nada.');
      }
      return { ok: true, lead, changed: false };
    }
  }
  const at = now.toISOString();
  const payout: SupplierPayout = {
    id: newId,
    bookingId,
    proveedor: input.proveedor,
    montoCRC: input.montoCRC,
    concepto: input.concepto,
    estado: 'pendiente_aprobacion',
    createdAt: at,
    createdBy: actor.kind === 'agent' ? `agente:${actor.by}` : actor.by,
    ...(input.clientRequestId ? { clientRequestId: input.clientRequestId } : {}),
    audit: [{ action: 'crear', from: null, to: 'pendiente_aprobacion', at, by: actor.kind === 'agent' ? `agente:${actor.by}` : actor.by }],
    ejecutadoPorSistema: false,
  };
  return { ok: true, changed: true, lead: withPayouts(lead, [...existing, payout], at) };
}

function locate(lead: LeadRecord, payoutId: string): { list: SupplierPayout[]; index: number } {
  const list = payoutsOf(lead);
  return { list, index: list.findIndex(p => p.id === payoutId) };
}

function transition(
  lead: LeadRecord,
  payoutId: string,
  to: SupplierPayoutState,
  action: SupplierPayoutAction,
  actor: SupplierPayoutActor,
  patch: Partial<SupplierPayout>,
  now: Date,
  note?: string,
): Result {
  const { list, index } = locate(lead, payoutId);
  if (index < 0) return fail('payout_not_found', 'Pago a proveedor no encontrado.');
  const current = list[index];
  if (!canTransitionSupplierPayout(current.estado, to)) {
    return fail('invalid_transition', `No se puede pasar de ${current.estado} a ${to}.`);
  }
  const at = now.toISOString();
  const updated: SupplierPayout = {
    ...current,
    ...patch,
    estado: to,
    ejecutadoPorSistema: false,
    audit: [...(current.audit || []), { action, from: current.estado, to, at, by: actor.by, ...(note ? { note } : {}) }],
  };
  const next = list.slice();
  next[index] = updated;
  return { ok: true, changed: true, lead: withPayouts(lead, next, at) };
}

/** Aprobar: solo el dueño humano, y solo si el pago del cliente sigue verificado. */
export function applyApproveSupplierPayout(lead: LeadRecord, booking: any | null, payoutId: string, actor: SupplierPayoutActor, now: Date = new Date()): Result {
  if (actor.kind === 'agent') return fail('agent_not_allowed', 'Ningún agente de IA puede aprobar pagos a proveedores.');
  if (!isHumanOwner(actor)) return fail('forbidden', 'Solo el dueño puede aprobar pagos a proveedores.');
  const { list, index } = locate(lead, payoutId);
  if (index >= 0 && (!booking || String(booking.id || booking.bookingId || list[index].bookingId) !== list[index].bookingId || !isCustomerPaymentVerified(booking))) {
    return fail('customer_payment_not_verified', 'El pago del cliente de esta reserva ya no está verificado. No se aprobó.');
  }
  return transition(lead, payoutId, 'aprobado', 'aprobar', actor, { approvedAt: now.toISOString(), approvedBy: actor.by }, now);
}

/** Registrar pago manual (hecho por el dueño fuera del sistema). Solo dueño humano. */
export function applyMarkSupplierPayoutPaid(lead: LeadRecord, payoutId: string, input: MarkPaidInput, actor: SupplierPayoutActor, now: Date = new Date()): Result {
  if (actor.kind === 'agent') return fail('agent_not_allowed', 'Ningún agente de IA puede registrar pagos a proveedores.');
  if (!isHumanOwner(actor)) return fail('forbidden', 'Solo el dueño puede registrar pagos a proveedores.');
  const ref = input.referencia.toUpperCase();
  if (payoutsOf(lead).some(p => p.id !== payoutId && p.estado === 'pagado_manual' && String(p.referencia || '').toUpperCase() === ref)) {
    return fail('duplicate_reference', 'Esa referencia ya está registrada en otro pago de este lead.');
  }
  return transition(lead, payoutId, 'pagado_manual', 'registrar_pago_manual', actor, {
    metodo: input.metodo,
    referencia: input.referencia,
    fechaPago: input.fechaPago,
    paidRecordedAt: now.toISOString(),
    paidRecordedBy: actor.by,
  }, now, input.note);
}

/** Cancelar un pago no realizado. Solo dueño humano. */
export function applyCancelSupplierPayout(lead: LeadRecord, payoutId: string, reason: string, actor: SupplierPayoutActor, now: Date = new Date()): Result {
  if (actor.kind === 'agent') return fail('agent_not_allowed', 'Ningún agente de IA puede cancelar pagos a proveedores.');
  if (!isHumanOwner(actor)) return fail('forbidden', 'Solo el dueño puede cancelar pagos a proveedores.');
  const motivo = cleanText(reason, 300);
  if (motivo.length < 3) return fail('invalid_input', 'Motivo de cancelación requerido.');
  return transition(lead, payoutId, 'cancelado', 'cancelar', actor, { cancelledAt: now.toISOString(), cancelledBy: actor.by, motivoCancelacion: motivo }, now, motivo);
}

// ---------------------------------------------------------------------------
// Capa de servicio (rutas HTTP). Sin Stripe, sin SINPE, sin bancos.
// ---------------------------------------------------------------------------

export interface ApiResult { status: number; body: Record<string, unknown> }

export interface SupplierPayoutDeps {
  getLead: (id: string) => Promise<LeadRecord | null>;
  getBooking: (bookingId: string) => Promise<any | null>;
  mutateLead: (id: string, mutate: (lead: LeadRecord) => Result) => Promise<LeadMutation<SupplierPayoutError | 'not_found'>>;
  newId?: () => string;
  now?: () => Date;
}

const STATUS_BY_ERROR: Record<string, number> = {
  not_found: 404,
  payout_not_found: 404,
  booking_not_found: 404,
  forbidden: 403,
  agent_not_allowed: 403,
  invalid_input: 400,
  lead_without_booking: 409,
  customer_payment_not_verified: 409,
  invalid_transition: 409,
  duplicate_request: 409,
  idempotency_conflict: 409,
  duplicate_reference: 409,
};

function defaultId(): string {
  return `sp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function errorResult(r: { error: string; message?: string }): ApiResult {
  return { status: STATUS_BY_ERROR[r.error] || 400, body: { success: false, error: r.error, message: r.message, ejecutadoPorSistema: false } };
}

function okResult(lead: LeadRecord, changed: boolean, payoutId?: string): ApiResult {
  const payouts = payoutsOf(lead);
  return {
    status: 200,
    body: {
      success: true,
      leadId: lead.id,
      bookingId: lead.bookingId ?? null,
      changed,
      ...(payoutId ? { payout: payouts.find(p => p.id === payoutId) ?? null } : {}),
      payouts,
      ejecutadoPorSistema: false,
      aviso: 'El sistema no ejecuta pagos: el dueño paga al proveedor por SINPE/transferencia fuera de la plataforma y aquí solo lo registra.',
    },
  };
}

function badLead(leadId: string): ApiResult | null {
  return LEAD_ID.test(String(leadId || '').trim()) ? null : { status: 400, body: { success: false, error: 'invalid_lead_id' } };
}

function badPayout(payoutId: string): ApiResult | null {
  return PAYOUT_ID.test(String(payoutId || '')) ? null : { status: 400, body: { success: false, error: 'invalid_payout_id' } };
}

export async function listSupplierPayouts(leadId: string, deps: Pick<SupplierPayoutDeps, 'getLead' | 'getBooking'>): Promise<ApiResult> {
  const bad = badLead(leadId); if (bad) return bad;
  const lead = await deps.getLead(leadId.trim());
  if (!lead) return { status: 404, body: { success: false, error: 'not_found', message: 'Lead no encontrado.' } };
  const bookingId = String(lead.bookingId || '').trim();
  const booking = bookingId ? await deps.getBooking(bookingId) : null;
  return {
    status: 200,
    body: {
      success: true,
      leadId: lead.id,
      bookingId: bookingId || null,
      pagoClienteVerificado: Boolean(booking && isCustomerPaymentVerified(booking)),
      payouts: payoutsOf(lead),
      ejecutadoPorSistema: false,
    },
  };
}

export async function createSupplierPayout(leadId: string, body: unknown, actor: SupplierPayoutActor, deps: SupplierPayoutDeps): Promise<ApiResult> {
  const bad = badLead(leadId); if (bad) return bad;
  const parsed = parseCreateInput(body);
  if (!parsed.ok) return { status: 400, body: { success: false, error: 'invalid_input', message: parsed.message } };
  const id = leadId.trim();
  const lead = await deps.getLead(id);
  if (!lead) return { status: 404, body: { success: false, error: 'not_found', message: 'Lead no encontrado.' } };
  const bookingId = String(lead.bookingId || '').trim();
  const booking = bookingId ? await deps.getBooking(bookingId) : null;
  const newId = (deps.newId || defaultId)();
  const now = (deps.now || (() => new Date()))();
  const r = await deps.mutateLead(id, l => {
    // La reserva enlazada pudo cambiar entre la lectura y la transacción.
    if (String(l.bookingId || '').trim() !== bookingId) return fail('customer_payment_not_verified', 'La reserva enlazada cambió. Vuelve a intentarlo.');
    return applyCreateSupplierPayout(l, booking, parsed.input, actor, newId, now);
  });
  if (!r.ok) return errorResult(r);
  const createdId = r.changed ? newId : payoutsOf(r.lead).find(p => p.clientRequestId === parsed.input.clientRequestId)?.id;
  const res = okResult(r.lead, r.changed, createdId);
  return r.changed ? { ...res, status: 201 } : res;
}

export async function approveSupplierPayout(leadId: string, payoutId: string, actor: SupplierPayoutActor, deps: SupplierPayoutDeps): Promise<ApiResult> {
  const bad = badLead(leadId) || badPayout(payoutId); if (bad) return bad;
  if (actor.kind === 'agent') return errorResult({ error: 'agent_not_allowed', message: 'Ningún agente de IA puede aprobar pagos a proveedores.' });
  const id = leadId.trim();
  const lead = await deps.getLead(id);
  if (!lead) return { status: 404, body: { success: false, error: 'not_found', message: 'Lead no encontrado.' } };
  const payout = payoutsOf(lead).find(p => p.id === payoutId);
  const booking = payout ? await deps.getBooking(payout.bookingId) : null;
  const now = (deps.now || (() => new Date()))();
  const r = await deps.mutateLead(id, l => applyApproveSupplierPayout(l, booking, payoutId, actor, now));
  return r.ok ? okResult(r.lead, r.changed, payoutId) : errorResult(r);
}

export async function markSupplierPayoutPaid(leadId: string, payoutId: string, body: unknown, actor: SupplierPayoutActor, deps: SupplierPayoutDeps): Promise<ApiResult> {
  const bad = badLead(leadId) || badPayout(payoutId); if (bad) return bad;
  if (actor.kind === 'agent') return errorResult({ error: 'agent_not_allowed', message: 'Ningún agente de IA puede registrar pagos a proveedores.' });
  const now = (deps.now || (() => new Date()))();
  const parsed = parseMarkPaidInput(body, now);
  if (!parsed.ok) return { status: 400, body: { success: false, error: 'invalid_input', message: parsed.message } };
  const r = await deps.mutateLead(leadId.trim(), l => applyMarkSupplierPayoutPaid(l, payoutId, parsed.input, actor, now));
  return r.ok ? okResult(r.lead, r.changed, payoutId) : errorResult(r);
}

export async function cancelSupplierPayout(leadId: string, payoutId: string, body: unknown, actor: SupplierPayoutActor, deps: SupplierPayoutDeps): Promise<ApiResult> {
  const bad = badLead(leadId) || badPayout(payoutId); if (bad) return bad;
  const reason = body && typeof body === 'object' ? (body as any).reason : '';
  const now = (deps.now || (() => new Date()))();
  const r = await deps.mutateLead(leadId.trim(), l => applyCancelSupplierPayout(l, payoutId, String(reason || ''), actor, now));
  return r.ok ? okResult(r.lead, r.changed, payoutId) : errorResult(r);
}
