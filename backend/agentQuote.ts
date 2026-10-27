/**
 * Fase C — herramienta create_quote: el asistente IA arma una cotización de un tour del
 * catálogo (tourId, fecha, pax, moneda) y devuelve su número (QTE-YYYYMMDD-XXXX).
 *
 * Fuentes de datos (no se inventa ninguna):
 *  - Tour: id/slug resuelto con el catálogo de get_product (agentProductTools.findCatalogTour).
 *  - Precio al cliente: la oferta publicada y vinculada a un proveedor en `tours`, con la
 *    misma resolución y reglas que la reserva y el pago (commerceCatalog.resolveCommerceTour +
 *    commercePolicy.reservationQuote). El catálogo estático no trae proveedor ni costo: sin
 *    oferta `bookable` con proveedor, o con datos de demostración ⇒ no se cotiza.
 *  - Costo del proveedor: la comisión contractual EXPLÍCITA del perfil verificado y activo
 *    del proveedor en Firestore (`operators.commissionRate` / `proveedores.comision`), con
 *    el mismo cálculo que las órdenes de servicio y los payouts
 *    (providerPayoutPolicy.calculateContractualSettlementUSD). Nunca se asume un % por defecto.
 *
 * Margen: el precio al cliente debe dejar al menos QUOTE_MIN_MARGIN_OVER_COST (20 %) sobre el
 * costo del proveedor. Si no lo deja, la cotización se RECHAZA (no se sube el precio): cambiar
 * precios requiere aprobación humana (docs/REGLAS_PLATAFORMA.md §1.7) y la regla del negocio
 * es "señalarlo en vez de ajustarlo" (agentSkillPack).
 *
 * Privacidad (Ley 8968 / PRODHAB y AGENTS.md §12):
 *  - La respuesta al modelo/cliente se arma con una lista blanca: nunca incluye nombre, id
 *    ni costo del proveedor, ni comisión ni margen.
 *  - leadId y sessionId se guardan solo como hash (hashIdentifier de agentEventLog).
 *  - Costo, margen, comisión e id del proveedor quedan en `internal` del documento, solo servidor.
 *  - La marca de tiempo, el vencimiento (48 h) y el número los pone el SERVIDOR.
 *
 * Solo escribe en la colección privada de servidor `agent_quotes` (Admin SDK; las reglas
 * cliente caen en el deny catch-all). Nunca lanza. No cobra, no crea enlaces de pago, no
 * llama a Stripe ni a APIs externas, no envía correos ni mensajes y no borra nada.
 */
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { hashIdentifier } from './agentEventLog';
import { findCatalogTour } from './agentProductTools';
import { resolveCommerceTour } from './commerceCatalog';
import { assertServiceDate, reservationQuote } from './commercePolicy';
import { calculateContractualSettlementUSD, isValidCommissionRate } from './providerPayoutPolicy';

export const AGENT_QUOTE_COLLECTION = 'agent_quotes';

/** Margen mínimo del negocio sobre el costo del proveedor: (precio − costo) / costo ≥ 20 %. */
export const QUOTE_MIN_MARGIN_OVER_COST = 0.20;

/** Vigencia de la cotización desde la marca de tiempo del servidor. */
export const QUOTE_VALIDITY_HOURS = 48;

/** El catálogo publica precios solo en USD; no hay fuente de tipo de cambio para cotizar en otra moneda. */
export const QUOTE_SUPPORTED_CURRENCIES = ['USD'] as const;

export const QUOTE_MAX_PAX = 50;
/** Horizonte máximo de fecha de viaje (días desde hoy en Costa Rica). */
export const QUOTE_MAX_DAYS_AHEAD = 730;

const CR_OFFSET_MS = 6 * 60 * 60 * 1000; // Costa Rica: UTC-6, sin horario de verano.

/** QTE-YYYYMMDD-XXXX con la fecha en hora de Costa Rica. */
export function buildQuoteNumber(now: Date, randomHex: string): string {
  const ymd = new Date(now.getTime() - CR_OFFSET_MS).toISOString().slice(0, 10).replace(/-/g, '');
  return `QTE-${ymd}-${randomHex.toUpperCase().slice(0, 4).padStart(4, '0')}`;
}

export function quoteExpiresAt(now: Date): string {
  return new Date(now.getTime() + QUOTE_VALIDITY_HOURS * 60 * 60 * 1000).toISOString();
}

const toCents = (usd: number) => Math.round(usd * 100);
const fromCents = (cents: number) => Number((cents / 100).toFixed(2));

/** true si el precio deja al menos QUOTE_MIN_MARGIN_OVER_COST sobre el costo (cálculo exacto en centavos). */
export function meetsMinimumMargin(clientPriceUSD: number, supplierCostUSD: number): boolean {
  const price = toCents(clientPriceUSD);
  const cost = toCents(supplierCostUSD);
  if (!(price > 0) || !(cost > 0)) return false;
  return (price - cost) * 100 >= cost * Math.round(QUOTE_MIN_MARGIN_OVER_COST * 100);
}

type DocSnap = { exists: boolean; id?: string; data: () => Record<string, any> | undefined };
type QuerySnap = { size: number; docs: DocSnap[] };

export interface AgentQuoteDeps {
  /** Inyectable en tests. `null` ⇒ almacenamiento no disponible. */
  db?: {
    collection: (name: string) => {
      add: (doc: Record<string, unknown>) => Promise<{ id: string }>;
      doc: (id: string) => { get: () => Promise<DocSnap> };
      where: (field: string, op: '==', value: unknown) => { limit: (n: number) => { get: () => Promise<QuerySnap> } };
    };
  } | null;
  now?: () => Date;
  /** Inyectable en tests: 4 caracteres hex. */
  randomHex?: () => string;
}

export interface CreateQuoteInput {
  tourId?: unknown;
  date?: unknown;
  pax?: unknown;
  currency?: unknown;
  leadId?: unknown;
}

export interface CreateQuoteContext {
  sessionId?: string;
  channel?: 'chat' | 'voice' | 'whatsapp' | 'admin';
  language?: 'es' | 'en';
}

/**
 * Comisión contractual explícita de un proveedor verificado y activo (mismo criterio que
 * providerCommunicationService.resolveOperationalProvider / providerPayoutService).
 * Devuelve null si no hay perfil válido; nunca un % por defecto.
 */
async function contractualCommissionRate(db: NonNullable<AgentQuoteDeps['db']>, providerId: string, tourId: string): Promise<number | null> {
  for (const collectionName of ['operators', 'proveedores'] as const) {
    const snap = await db.collection(collectionName).doc(providerId).get();
    if (!snap?.exists) continue;
    const data = snap.data() || {};
    const verified = collectionName === 'operators' ? data.verified === true : data.verificado === true;
    const activeFlag = collectionName === 'operators' ? data.active === true : data.activo === true;
    const active = verified && activeFlag && String(data.status || '').toLowerCase() !== 'inactivo';
    const activeTours = Array.isArray(data.activeTours) ? data.activeTours.map(String) : (Array.isArray(data.tours) ? data.tours.map(String) : []);
    if (!active || (activeTours.length > 0 && !activeTours.includes(tourId))) return null;
    const rate = collectionName === 'operators' ? data.commissionRate : (data.comision ?? data.commissionRate);
    return isValidCommissionRate(rate) ? rate : null;
  }
  return null;
}

export async function createQuote(input: CreateQuoteInput, context: CreateQuoteContext = {}, deps: AgentQuoteDeps = {}) {
  try {
    const rawTourId = String(input.tourId ?? '').trim();
    // Mismo catálogo que get_product para resolver id/slug; la oferta vigente vive en `tours`.
    const tourId = findCatalogTour(rawTourId)?.id ?? rawTourId;
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(tourId)) return { success: false as const, created: false, error: 'tour_not_found' };

    const currency = String(input.currency ?? 'USD').trim().toUpperCase() || 'USD';
    if (!(QUOTE_SUPPORTED_CURRENCIES as readonly string[]).includes(currency)) {
      return { success: false as const, created: false, error: 'unsupported_currency', supportedCurrencies: [...QUOTE_SUPPORTED_CURRENCIES] };
    }

    const now = (deps.now ?? (() => new Date()))();
    const date = String(input.date ?? '').trim();
    try {
      assertServiceDate(date, now);
    } catch {
      return { success: false as const, created: false, error: 'invalid_date', expectedFormat: 'YYYY-MM-DD (today or later, Costa Rica time)' };
    }
    const todayCR = new Date(now.getTime() - CR_OFFSET_MS).toISOString().slice(0, 10);
    const maxDate = new Date(Date.parse(`${todayCR}T00:00:00Z`) + QUOTE_MAX_DAYS_AHEAD * 86_400_000).toISOString().slice(0, 10);
    if (date > maxDate) return { success: false as const, created: false, error: 'date_out_of_range' };

    const pax = Number(input.pax);
    if (!Number.isInteger(pax) || pax < 1 || pax > QUOTE_MAX_PAX) {
      return { success: false as const, created: false, error: 'invalid_pax', maxPax: QUOTE_MAX_PAX };
    }

    // Import diferido: evita el ciclo bookingService → agentTools → agentPhaseCRegistry → este módulo.
    const db = deps.db === undefined ? (await import('./bookingService')).getFirestoreDb() : deps.db;
    if (!db) return { success: false as const, created: false, error: 'storage_unavailable' };

    // Oferta publicable (misma resolución y reglas que la reserva y el pago: resolveCommerceTour + reservationQuote).
    const tour: any = await resolveCommerceTour(db as any, tourId);
    if (!tour) {
      return findCatalogTour(tourId)
        ? { success: false as const, created: false, error: 'price_not_available', next: 'create_ticket' }
        : { success: false as const, created: false, error: 'tour_not_found' };
    }
    if (tour.isDemoData === true) return { success: false as const, created: false, error: 'price_not_available', next: 'create_ticket' };
    const maxGroup = Number(tour.maxGroupSize);
    if (Number.isInteger(maxGroup) && maxGroup > 0 && pax > maxGroup) {
      return { success: false as const, created: false, error: 'invalid_pax', maxPax: maxGroup };
    }
    let priced: ReturnType<typeof reservationQuote>;
    try {
      priced = reservationQuote(tour, pax, 0);
    } catch {
      return { success: false as const, created: false, error: 'price_not_available', next: 'create_ticket' };
    }
    const unitPriceUSD = fromCents(toCents(priced.unitPriceUSD));
    const clientPriceUSD = fromCents(toCents(priced.totalUSD));

    const providerId = String(tour.providerId || '').trim();
    const commissionRate = await contractualCommissionRate(db, providerId, tourId);
    const settlement = commissionRate === null ? null : calculateContractualSettlementUSD(clientPriceUSD, commissionRate);
    if (!settlement) {
      return { success: false as const, created: false, error: 'supplier_cost_unavailable', next: 'create_ticket' };
    }
    const supplierCostUSD = settlement.payoutAmountUSD;
    if (!meetsMinimumMargin(clientPriceUSD, supplierCostUSD)) {
      // Se rechaza sin subir el precio: un cambio de precio lo aprueba una persona.
      return { success: false as const, created: false, error: 'margin_below_minimum', next: 'create_ticket' };
    }
    const marginUSD = fromCents(toCents(clientPriceUSD) - toCents(supplierCostUSD));

    const timestamp = now.toISOString();
    const expiresAt = quoteExpiresAt(now);
    const quoteNumber = buildQuoteNumber(now, (deps.randomHex ?? (() => crypto.randomBytes(2).toString('hex')))());
    const record = {
      quoteNumber,
      status: 'quoted' as const,
      tourId,
      date,
      pax,
      currency,
      unitPriceUSD,
      clientPriceUSD,
      leadIdHash: hashIdentifier('lead', input.leadId),
      sessionIdHash: hashIdentifier('session', context.sessionId),
      channel: context.channel ?? null,
      language: context.language ?? null,
      timestamp,
      expiresAt,
      // SOLO SERVIDOR: nunca sale en la respuesta del tool.
      internal: {
        providerId,
        commissionRate,
        supplierCostUSD,
        marginUSD,
        marginOverCost: Number((marginUSD / supplierCostUSD).toFixed(4)),
        minMarginOverCost: QUOTE_MIN_MARGIN_OVER_COST,
        costSource: 'contractual_commission',
      },
      source: 'agent_phase_c',
    };

    const ref = await db.collection(AGENT_QUOTE_COLLECTION).add({ ...record, createdAt: FieldValue.serverTimestamp() });
    // Lista blanca explícita: nada del proveedor, ni costo, ni margen.
    return {
      success: true as const,
      created: true,
      quoteNumber,
      quoteId: ref.id,
      status: 'quoted' as const,
      tourId,
      date,
      pax,
      currency,
      unitPrice: unitPriceUSD,
      totalPrice: clientPriceUSD,
      timestamp,
      expiresAt,
      message: 'Quote created; valid for 48 hours. Availability is confirmed before any payment. No payment link is created and nothing is sent.',
    };
  } catch {
    return { success: false as const, created: false, error: 'storage_write_failed' };
  }
}
