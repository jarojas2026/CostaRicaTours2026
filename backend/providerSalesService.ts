/**
 * Ventas, comisiones y liquidaciones del proveedor (#321).
 *
 * Fuente única: `bookings` del tenant + comisión registrada (#309) en
 * `operators.commissionRate` / `proveedores.comision`. Nunca se asume un %:
 * sin comisión válida el neto es `null` (no disponible).
 * - Neto real = `payoutAmountUSD` si el payout ya está `paid`.
 * - Si no, neto **estimado** con la misma fórmula de la política
 *   (`calculateContractualSettlementUSD`), etiquetado como estimado.
 * - Estado de liquidación según `evaluatePayoutEligibility` (solo lectura;
 *   este módulo nunca ejecuta pagos).
 * - Decisión del dueño (2026-10-20, #347): el proveedor NO debe poder deducir
 *   el precio al cliente. Por defecto solo ve su **neto a recibir**:
 *   - bruto (`grossUSD`) oculto salvo `PROVIDER_PORTAL_SHOW_GROSS=true`;
 *   - % de comisión (`commissionRate`, `commissionRates`, `profileCommissionRate`)
 *     y monto de comisión (`commissionUSD`) ocultos salvo
 *     `PROVIDER_PORTAL_SHOW_COMMISSION=true`.
 *   La comisión se sigue usando internamente para calcular neto y liquidación.
 */
import { normalizeBookingLifecycle } from './bookingStateMachine';
import type { ProviderContext } from './providerAuth';
import {
  calculateContractualSettlementUSD,
  costaRicaDateString,
  evaluatePayoutEligibility,
  isValidCommissionRate,
  type PayoutEligibilityReason,
} from './providerPayoutPolicy';

export const PROVIDER_SALES_METRICS_VERSION = 'provider-sales-v1';
const MAX_SOURCE_BOOKINGS = 2000;

export function providerPortalShowsGross(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env.PROVIDER_PORTAL_SHOW_GROSS || '').trim().toLowerCase() === 'true';
}

export function providerPortalShowsCommission(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env.PROVIDER_PORTAL_SHOW_COMMISSION || '').trim().toLowerCase() === 'true';
}

export type ProviderPortalVisibility = { showGross: boolean; showCommission: boolean };

export type SettlementStatus = 'paid' | 'processing' | 'eligible' | 'pending_eligibility' | 'blocked';

export interface ProviderSaleLine {
  bookingRef: string;
  serviceDate: string;
  period: string;
  tourId: string | null;
  tourName: string | null;
  commissionRate?: number | null;
  netUSD: number | null;
  netSource: 'payout_paid' | 'estimated' | 'unavailable';
  grossUSD?: number | null;
  commissionUSD?: number | null;
  settlementStatus: SettlementStatus;
  settlementReason: PayoutEligibilityReason | 'commission_unavailable' | null;
}

const round2 = (n: number) => Number(n.toFixed(2));

export function bookingRefOf(id: string): string {
  return String(id || '').replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase() || '—';
}

const EXCLUDED_LIFECYCLES = new Set(['cancelled', 'refunded']);

/** Una venta = pago verificado y no cancelada/reembolsada. */
export function isCountableSale(booking: Record<string, any>): boolean {
  if (String(booking?.paymentStatus || '').trim().toLowerCase() !== 'completed') return false;
  if (EXCLUDED_LIFECYCLES.has(normalizeBookingLifecycle(booking?.status)) || EXCLUDED_LIFECYCLES.has(normalizeBookingLifecycle(booking?.lifecycle))) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(booking?.date || ''));
}

function settlementOf(booking: Record<string, any>, todayCR: string, hasRate: boolean): Pick<ProviderSaleLine, 'settlementStatus' | 'settlementReason'> {
  const eligibility = evaluatePayoutEligibility(booking, todayCR);
  if (eligibility.eligible) {
    return hasRate ? { settlementStatus: 'eligible', settlementReason: null } : { settlementStatus: 'blocked', settlementReason: 'commission_unavailable' };
  }
  switch (eligibility.reason) {
    case 'already_paid': return { settlementStatus: 'paid', settlementReason: null };
    case 'payout_in_progress': return { settlementStatus: 'processing', settlementReason: null };
    case 'tour_not_completed':
    case 'booking_not_provider_confirmed':
    case 'provider_confirmation_missing':
      return { settlementStatus: 'pending_eligibility', settlementReason: eligibility.reason };
    default:
      return { settlementStatus: 'blocked', settlementReason: eligibility.reason };
  }
}

export function buildSaleLine(
  booking: Record<string, any>,
  profileRate: number | null,
  options: { showGross: boolean; showCommission?: boolean; todayCR: string },
): ProviderSaleLine {
  const rate = isValidCommissionRate(booking.commissionRate) ? booking.commissionRate : profileRate;
  const totalUSD = Number(booking.totalUSD);
  const paidAmount = Number(booking.payoutAmountUSD);
  let netUSD: number | null = null;
  let netSource: ProviderSaleLine['netSource'] = 'unavailable';
  if (String(booking.payoutStatus || '').toLowerCase() === 'paid' && Number.isFinite(paidAmount) && paidAmount > 0) {
    netUSD = round2(paidAmount);
    netSource = 'payout_paid';
  } else {
    const estimate = calculateContractualSettlementUSD(totalUSD, rate);
    if (estimate) { netUSD = estimate.payoutAmountUSD; netSource = 'estimated'; }
  }
  const line: ProviderSaleLine = {
    bookingRef: bookingRefOf(booking.id),
    serviceDate: String(booking.date),
    period: String(booking.date).slice(0, 7),
    tourId: booking.tourId ? String(booking.tourId) : null,
    tourName: booking.tourName ? String(booking.tourName).slice(0, 160) : null,
    netUSD,
    netSource,
    ...settlementOf(booking, options.todayCR, isValidCommissionRate(rate)),
  };
  const gross = Number.isFinite(totalUSD) && totalUSD > 0 ? round2(totalUSD) : null;
  if (options.showGross) line.grossUSD = gross;
  if (options.showCommission) {
    line.commissionRate = isValidCommissionRate(rate) ? rate : null;
    line.commissionUSD = gross !== null && netUSD !== null ? round2(gross - netUSD) : null;
  }
  return line;
}

function sumKnown(values: Array<number | null | undefined>): number | null {
  const known = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return known.length ? round2(known.reduce((a, b) => a + b, 0)) : null;
}

export function periodRange(months: number, todayCR: string): { from: string; to: string } {
  const [y, m] = todayCR.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1 - (months - 1), 1));
  // Incluye servicios futuros ya pagados (hasta 12 meses adelante).
  const end = new Date(Date.UTC(y, m - 1 + 12, 1));
  return { from: start.toISOString().slice(0, 7), to: end.toISOString().slice(0, 7) };
}

export function summarizeSales(lines: ProviderSaleLine[], showGross: boolean, showCommission = false) {
  const group = (keyOf: (l: ProviderSaleLine) => string) => {
    const map = new Map<string, ProviderSaleLine[]>();
    for (const line of lines) {
      const key = keyOf(line);
      map.set(key, [...(map.get(key) || []), line]);
    }
    return map;
  };
  const agg = (items: ProviderSaleLine[]) => ({
    bookings: items.length,
    netUSD: sumKnown(items.map((l) => l.netUSD)),
    linesWithoutNet: items.filter((l) => l.netUSD === null).length,
    ...(showGross ? { grossUSD: sumKnown(items.map((l) => l.grossUSD)) } : {}),
    ...(showCommission ? { commissionUSD: sumKnown(items.map((l) => l.commissionUSD)) } : {}),
  });
  const byMonth = [...group((l) => l.period)].sort(([a], [b]) => a.localeCompare(b)).map(([period, items]) => ({ period, ...agg(items) }));
  const byService = [...group((l) => l.tourId || 'sin_servicio')]
    .map(([tourId, items]) => ({ tourId: tourId === 'sin_servicio' ? null : tourId, tourName: items.find((l) => l.tourName)?.tourName || null, ...agg(items) }))
    .sort((a, b) => (b.netUSD ?? -1) - (a.netUSD ?? -1));
  const rates = showCommission
    ? [...new Set(lines.map((l) => l.commissionRate).filter((r): r is number => typeof r === 'number'))]
    : null;
  return { totals: agg(lines), byMonth, byService, ...(rates ? { commissionRates: rates } : {}) };
}

export function summarizeSettlements(lines: ProviderSaleLine[]) {
  const periods = new Map<string, ProviderSaleLine[]>();
  for (const line of lines) periods.set(line.period, [...(periods.get(line.period) || []), line]);
  const byStatus = (items: ProviderSaleLine[], status: SettlementStatus) => sumKnown(items.filter((l) => l.settlementStatus === status).map((l) => l.netUSD));
  return [...periods].sort(([a], [b]) => b.localeCompare(a)).map(([period, items]) => ({
    period,
    totals: {
      paidUSD: byStatus(items, 'paid'),
      processingUSD: byStatus(items, 'processing'),
      eligibleUSD: byStatus(items, 'eligible'),
      pendingUSD: byStatus(items, 'pending_eligibility'),
      blockedUSD: byStatus(items, 'blocked'),
    },
    lines: items
      .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate))
      .map(({ bookingRef, serviceDate, tourName, commissionRate, netUSD, netSource, settlementStatus, settlementReason, grossUSD }) => ({
        bookingRef, serviceDate, tourName, netUSD, netSource, settlementStatus, settlementReason,
        ...(commissionRate !== undefined ? { commissionRate } : {}),
        ...(grossUSD !== undefined ? { grossUSD } : {}),
      })),
  }));
}

/** Comisión registrada del proveedor (misma fuente que el payout); null si no hay. */
export async function loadProviderCommissionRate(db: any, providerId: string): Promise<number | null> {
  const operator = await db.collection('operators').doc(providerId).get();
  if (operator.exists) {
    const rate = operator.data()?.commissionRate;
    return isValidCommissionRate(rate) ? rate : null;
  }
  const legacy = await db.collection('proveedores').doc(providerId).get();
  if (legacy.exists) {
    const data = legacy.data() || {};
    const rate = data.comision ?? data.commissionRate;
    return isValidCommissionRate(rate) ? rate : null;
  }
  return null;
}

export async function loadProviderSaleLines(
  db: any,
  ctx: ProviderContext,
  options: { months?: number; todayCR?: string; showGross?: boolean; showCommission?: boolean } = {},
) {
  if (!db) throw new Error('firestore_unavailable');
  const months = Math.min(Math.max(Math.trunc(Number(options.months) || 12), 1), 24);
  const todayCR = options.todayCR || costaRicaDateString();
  const showGross = options.showGross ?? providerPortalShowsGross();
  const showCommission = options.showCommission ?? providerPortalShowsCommission();
  const range = periodRange(months, todayCR);
  const [snap, profileRate] = await Promise.all([
    db.collection('bookings').where('providerId', '==', ctx.providerId).limit(MAX_SOURCE_BOOKINGS).get(),
    loadProviderCommissionRate(db, ctx.providerId),
  ]);
  const bookings = (snap.docs || []).map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }))
    // Defensa en profundidad: nunca líneas de otro tenant.
    .filter((b: any) => String(b.providerId || '') === ctx.providerId)
    .filter(isCountableSale)
    .filter((b: any) => {
      const period = String(b.date).slice(0, 7);
      return period >= range.from && period <= range.to;
    });
  const lines: ProviderSaleLine[] = bookings.map((b: any) => buildSaleLine(b, profileRate, { showGross, showCommission, todayCR }));
  return {
    lines,
    meta: {
      metricsVersion: PROVIDER_SALES_METRICS_VERSION,
      computedAt: new Date().toISOString(),
      range,
      sourceCount: lines.length,
      truncated: (snap.docs || []).length >= MAX_SOURCE_BOOKINGS,
      showGross,
      showCommission,
      ...(showCommission ? { profileCommissionRate: profileRate } : {}),
      definition: 'Ventas con pago verificado (paymentStatus=completed), no canceladas ni reembolsadas, por fecha de servicio. Neto = lo que el proveedor recibe (payout pagado o estimado según lo pactado).',
    },
  };
}
